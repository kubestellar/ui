package api

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"
)

type DeployRequest struct {
	RepoURL       string `json:"repo_url"`
	FolderPath    string `json:"folder_path"`
	WorkloadLabel string `json:"workload_label"`
}

// GitHubContentResponse represents the GitHub API response for a file's content
type GitHubContentResponse struct {
	Type        string `json:"type"`
	Encoding    string `json:"encoding"`
	Size        int    `json:"size"`
	Name        string `json:"name"`
	Path        string `json:"path"`
	Content     string `json:"content"`
	SHA         string `json:"sha"`
	URL         string `json:"url"`
	DownloadURL string `json:"download_url"`
}

// GitHubDirectoryResponse represents a GitHub API response for directory listing
type GitHubDirectoryResponse []struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	SHA         string `json:"sha"`
	Size        int    `json:"size"`
	URL         string `json:"url"`
	HTMLURL     string `json:"html_url"`
	GitURL      string `json:"git_url"`
	DownloadURL string `json:"download_url"`
	Type        string `json:"type"`
}

// GitHubWebhookPayload defines the expected structure of the webhook request
type GitHubWebhookPayload struct {
	Repository struct {
		CloneURL string `json:"clone_url"`
	} `json:"repository"`
	Ref     string `json:"ref"` // Format: "refs/heads/main"
	Commits []struct {
		ID       string   `json:"id"`
		Message  string   `json:"message"`
		URL      string   `json:"url"`
		Modified []string `json:"modified"`
	} `json:"commits"`
}

// Fetches YAML files from a GitHub repository directory without cloning
func fetchGitHubYAMLs(repoURL, folderPath, branch, gitUsername, gitToken string) (map[string][]byte, error) {
	// Extract owner and repo from the GitHub URL
	// Example: from https://github.com/owner/repo.git to owner/repo
	urlParts := strings.Split(strings.TrimSuffix(repoURL, ".git"), "/")
	ownerRepo := fmt.Sprintf("%s/%s", urlParts[len(urlParts)-2], urlParts[len(urlParts)-1])

	// Prepare the GitHub API URL to fetch directory contents
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s?ref=%s",
		ownerRepo, folderPath, branch)

	// Create a request with authentication if provided
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// Add authentication if provided
	if gitUsername != "" && gitToken != "" {
		req.SetBasicAuth(gitUsername, gitToken)
	} else if gitToken != "" {
		req.Header.Set("Authorization", "token "+gitToken)
	}

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch repository contents: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("GitHub API error: %s - %s", resp.Status, string(bodyBytes))
	}

	// Read and process the response
	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read API response: %v", err)
	}

	// Try to parse as a directory first
	var dirContents GitHubDirectoryResponse
	if err := json.Unmarshal(bodyBytes, &dirContents); err != nil {
		// If not a directory, it might be a single file
		var fileContent GitHubContentResponse
		if err := json.Unmarshal(bodyBytes, &fileContent); err != nil {
			return nil, fmt.Errorf("failed to parse GitHub API response: %v", err)
		}

		// If it's a single YAML file, process it
		if strings.HasSuffix(fileContent.Name, ".yaml") || strings.HasSuffix(fileContent.Name, ".yml") {
			decodedContent, err := base64.StdEncoding.DecodeString(fileContent.Content)
			if err != nil {
				return nil, fmt.Errorf("failed to decode file content: %v", err)
			}

			return map[string][]byte{fileContent.Path: decodedContent}, nil
		}
		return map[string][]byte{}, nil
	}

	// Process directory contents recursively
	yamlFiles := make(map[string][]byte)
	for _, item := range dirContents {
		if item.Type == "file" && (strings.HasSuffix(item.Name, ".yaml") || strings.HasSuffix(item.Name, ".yml")) {
			// Fetch the YAML file content
			fileReq, err := http.NewRequest("GET", item.URL, nil)
			if err != nil {
				return nil, fmt.Errorf("failed to create file request: %v", err)
			}

			fileReq.Header.Set("Accept", "application/vnd.github.v3+json")
			if gitUsername != "" && gitToken != "" {
				fileReq.SetBasicAuth(gitUsername, gitToken)
			} else if gitToken != "" {
				fileReq.Header.Set("Authorization", "token "+gitToken)
			}

			fileResp, err := client.Do(fileReq)
			if err != nil {
				return nil, fmt.Errorf("failed to fetch file content: %v", err)
			}

			fileBytes, err := ioutil.ReadAll(fileResp.Body)
			fileResp.Body.Close()
			if err != nil {
				return nil, fmt.Errorf("failed to read file content: %v", err)
			}

			var fileContent GitHubContentResponse
			if err := json.Unmarshal(fileBytes, &fileContent); err != nil {
				return nil, fmt.Errorf("failed to parse file content: %v", err)
			}

			decodedContent, err := base64.StdEncoding.DecodeString(fileContent.Content)
			if err != nil {
				return nil, fmt.Errorf("failed to decode file content: %v", err)
			}

			yamlFiles[item.Path] = decodedContent
		} else if item.Type == "dir" {
			// Recursively fetch YAML files from subdirectories
			subPath := filepath.Join(folderPath, item.Name)
			subFiles, err := fetchGitHubYAMLs(repoURL, subPath, branch, gitUsername, gitToken)
			if err != nil {
				return nil, err
			}

			for path, content := range subFiles {
				yamlFiles[path] = content
			}
		}
	}

	return yamlFiles, nil
}

// DeployHandler that uses the GitHub API instead of cloning
func DeployHandler(c *gin.Context) {
	var request DeployRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	if request.RepoURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repo_url is required"})
		return
	}

	// Extract query parameters
	dryRun := c.Query("dryRun") == "true"
	dryRunStrategy := c.Query("dryRunStrategy")
	gitUsername := c.Query("git_username")
	gitToken := c.Query("git_token")
	branch := c.Query("branch")
	createdByMe := c.Query("created_by_me") == "true"
	deploymentID := c.Query("id")

	if branch == "" {
		branch = "main" // Default branch
	}

	// If workload label is not provided, use the GitHub project name from the repo URL
	if request.WorkloadLabel == "" {
		// Extract project name from repo URL
		// Example: from https://github.com/org/project.git to project
		repoBase := filepath.Base(request.RepoURL)
		projectName := strings.TrimSuffix(repoBase, filepath.Ext(repoBase))
		request.WorkloadLabel = projectName
	}

	// Save deployment configuration in Redis for webhook usage
	redis.SetFilePath(request.FolderPath)
	redis.SetRepoURL(request.RepoURL)
	redis.SetBranch(branch)
	redis.SetGitToken(gitToken)
	redis.SetWorkloadLabel(request.WorkloadLabel)

	// Create temporary directory to store downloaded YAML files
	tempDir, err := ioutil.TempDir("", "github-yamls-")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temporary directory", "details": err.Error()})
		return
	}
	defer os.RemoveAll(tempDir)

	// Fetch YAML files from GitHub using the API
	yamlFiles, err := fetchGitHubYAMLs(request.RepoURL, request.FolderPath, branch, gitUsername, gitToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch YAML files", "details": err.Error()})
		return
	}

	// Write YAML files to temporary directory
	for path, content := range yamlFiles {
		// Get relative path from the folder path
		relPath := path
		if request.FolderPath != "" && strings.HasPrefix(path, request.FolderPath) {
			relPath = strings.TrimPrefix(path, request.FolderPath)
			relPath = strings.TrimPrefix(relPath, "/")
		}

		filePath := filepath.Join(tempDir, relPath)

		// Ensure directory exists
		dir := filepath.Dir(filePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory structure", "details": err.Error()})
			return
		}

		// Write file
		if err := ioutil.WriteFile(filePath, content, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write YAML file", "details": err.Error()})
			return
		}
	}

	// Deploy the manifests with workload label using the temporary directory
	deploymentTree, err := k8s.DeployManifests(tempDir, dryRun, dryRunStrategy, request.WorkloadLabel)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	// Store deployment data in ConfigMap if it's created by the user
	if createdByMe {
		// Create timestamp for deployment ID if not provided
		timestamp := time.Now().Format("20060102150405")
		if deploymentID == "" {
			deploymentID = fmt.Sprintf("github-%s-%s", filepath.Base(request.RepoURL), timestamp)
		}

		// Prepare deployment data for ConfigMap
		deploymentData := map[string]string{
			"id":               deploymentID,
			"timestamp":        time.Now().Format(time.RFC3339),
			"repo_url":         request.RepoURL,
			"folder_path":      request.FolderPath,
			"branch":           branch,
			"dry_run":          fmt.Sprintf("%v", dryRun),
			"dry_run_strategy": dryRunStrategy,
			"created_by_me":    "true",
			"workload_label":   request.WorkloadLabel,
		}

		// Convert deployment tree to JSON string for storage
		deploymentTreeJSON, _ := json.Marshal(deploymentTree)
		deploymentData["deployment_tree"] = string(deploymentTreeJSON)

		// Get existing deployments
		existingDeployments, err := k8s.GetGithubDeployments("its1")
		if err != nil {
			// If error, start with empty deployments array
			existingDeployments = []any{}
		}

		// Add new deployment to existing ones
		newDeployment := map[string]interface{}{
			"id":             deploymentID,
			"timestamp":      deploymentData["timestamp"],
			"repo_url":       deploymentData["repo_url"],
			"folder_path":    deploymentData["folder_path"],
			"branch":         deploymentData["branch"],
			"dry_run":        deploymentData["dry_run"],
			"created_by_me":  deploymentData["created_by_me"],
			"workload_label": deploymentData["workload_label"],
		}

		existingDeployments = append(existingDeployments, newDeployment)
		deploymentsJSON, _ := json.Marshal(existingDeployments)

		// Store in ConfigMap
		cmData := map[string]string{
			"deployments": string(deploymentsJSON),
		}

		err = k8s.StoreGitHubDeployment(cmData)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store deployment data", "details": err.Error()})
			return
		}
	}

	response := gin.H{
		"message": func() string {
			if dryRun {
				return "Dry run successful. No changes applied."
			}
			return "Deployment successful"
		}(),
		"dryRunStrategy":  dryRunStrategy,
		"deployment_tree": deploymentTree,
		"stored":          createdByMe,
		"id":              deploymentID,
		"workload_label":  request.WorkloadLabel,
		"files_processed": len(yamlFiles),
	}

	if createdByMe {
		response["storage_details"] = "Deployment data stored in ConfigMap for future reference"
	} else {
		response["storage_details"] = "Deployment data not stored (created_by_me=false)"
	}

	c.JSON(http.StatusOK, response)
}
func GitHubWebhookHandler(c *gin.Context) {
	// Create a wrapper for the nested JSON structure
	var webhookWrapper struct {
		Payload string `json:"payload"`
	}

	if err := c.ShouldBindJSON(&webhookWrapper); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook wrapper", "details": err.Error()})
		return
	}

	// Parse the inner payload JSON string
	var request GitHubWebhookPayload
	if err := json.Unmarshal([]byte(webhookWrapper.Payload), &request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse webhook payload", "details": err.Error()})
		return
	}

	// Get deployment configuration from Redis
	folderPath, err := redis.GetFilePath()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No deployment configured for this repository"})
		return
	}

	// Get the configured branch from Redis
	storedBranch, err := redis.GetBranch()
	if err != nil {
		storedBranch = "main" // Default branch if not set
	}

	// Check if the webhook is for the configured branch
	branchFromRef := strings.TrimPrefix(request.Ref, "refs/heads/")
	if branchFromRef != storedBranch {
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Ignoring push to branch '%s'. Configured branch is '%s'", branchFromRef, storedBranch)})
		return
	}

	// Get workload label from Redis
	workloadLabel, err := redis.GetWorkloadLabel()
	if err != nil || workloadLabel == "" {
		// If no workload label is stored, extract project name from repository URL
		repoUrl := request.Repository.CloneURL
		repoBase := filepath.Base(repoUrl)
		projectName := strings.TrimSuffix(repoBase, filepath.Ext(repoBase))
		workloadLabel = projectName
	}

	// Check if any changes occurred in the specified folder path
	relevantChanges := false
	var changedFiles []string

	// If folderPath is empty, any change is relevant
	if folderPath == "" {
		relevantChanges = len(request.Commits) > 0
	} else {
		// Check each commit for changes in the relevant folder
		for _, commit := range request.Commits {
			for _, file := range commit.Modified {
				if strings.HasPrefix(file, folderPath) {
					relevantChanges = true
					changedFiles = append(changedFiles, file)
				}
			}
		}
	}

	if !relevantChanges {
		c.JSON(http.StatusOK, gin.H{"message": "No relevant changes detected in the specified folder path"})
		return
	}

	// Get repository URL from webhook payload
	repoUrl := request.Repository.CloneURL

	// Get access token from Redis
	gitToken, _ := redis.GetGitToken()

	// Always use false for dryRun and empty string for dryRunStrategy
	dryRun := false
	dryRunStrategy := ""

	// Create temporary directory to store downloaded YAML files
	tempDir, err := ioutil.TempDir("", "github-webhook-yamls-")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temporary directory", "details": err.Error()})
		return
	}
	defer os.RemoveAll(tempDir)

	// Fetch YAML files from GitHub using the API
	yamlFiles, err := fetchGitHubYAMLs(repoUrl, folderPath, storedBranch, "", gitToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch YAML files", "details": err.Error()})
		return
	}

	// Write YAML files to temporary directory
	for path, content := range yamlFiles {
		// Get relative path from the folder path
		relPath := path
		if folderPath != "" && strings.HasPrefix(path, folderPath) {
			relPath = strings.TrimPrefix(path, folderPath)
			relPath = strings.TrimPrefix(relPath, "/")
		}

		filePath := filepath.Join(tempDir, relPath)

		// Ensure directory exists
		dir := filepath.Dir(filePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create directory structure", "details": err.Error()})
			return
		}

		// Write file
		if err := ioutil.WriteFile(filePath, content, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write YAML file", "details": err.Error()})
			return
		}
	}

	// For webhook deployments, always deploy and store the data
	deploymentTree, err := k8s.DeployManifests(tempDir, dryRun, dryRunStrategy, workloadLabel)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	// Create timestamp for deployment ID
	timestamp := time.Now().Format("20060102150405")
	deploymentID := fmt.Sprintf("github-webhook-%s-%s", filepath.Base(repoUrl), timestamp)

	// Convert deployment tree to JSON string for storage
	deploymentTreeJSON, _ := json.Marshal(deploymentTree)

	// Get existing deployments
	existingDeployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		// If error, start with empty deployments array
		existingDeployments = []any{}
	}

	// Add new deployment to existing ones
	newDeployment := map[string]interface{}{
		"id":             deploymentID,
		"timestamp":      time.Now().Format(time.RFC3339),
		"repo_url":       repoUrl,
		"folder_path":    folderPath,
		"branch":         storedBranch,
		"changed_files":  changedFiles,
		"webhook":        true,
		"commit_refs":    request.Commits[0].ID,
		"workload_label": workloadLabel,
	}

	existingDeployments = append(existingDeployments, newDeployment)
	deploymentsJSON, _ := json.Marshal(existingDeployments)

	// Store in ConfigMap
	cmData := map[string]string{
		"deployments":          string(deploymentsJSON),
		"last_deployment_tree": string(deploymentTreeJSON),
	}

	err = k8s.StoreGitHubDeployment(cmData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store deployment data", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Webhook deployment successful",
		"deployment":      deploymentTree,
		"changed_files":   changedFiles,
		"storage_details": "Deployment data stored in ConfigMap",
		"workload_label":  workloadLabel,
	})
}

// createHelmActionConfig initializes the Helm action configuration using WDS1 context
func CreateHelmActionConfig(namespace string) (*action.Configuration, error) {
	actionConfig := new(action.Configuration)
	helmSettings := cli.New()

	if err := actionConfig.Init(helmSettings.RESTClientGetter(), namespace, "secret", log.Printf); err != nil {
		return nil, fmt.Errorf("failed to initialize Helm: %v", err)
	}

	return actionConfig, nil
}
