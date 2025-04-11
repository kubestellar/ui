package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
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

// DeployHandler handles deployment requests
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
	redis.SetWorkloadLabel(request.WorkloadLabel) // Store workload label in Redis

	tempDir := fmt.Sprintf("/tmp/%d", time.Now().Unix())
	cloneURL := request.RepoURL

	if gitUsername != "" && gitToken != "" {
		cloneURL = fmt.Sprintf("https://%s:%s@%s", gitUsername, gitToken, request.RepoURL[8:])
	}

	// Clone the repository
	cmd := exec.Command("git", "clone", "-b", branch, cloneURL, tempDir)
	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clone repo", "details": err.Error()})
		return
	}
	defer os.RemoveAll(tempDir)

	deployPath := tempDir
	if request.FolderPath != "" {
		deployPath = filepath.Join(tempDir, request.FolderPath)
	}

	if _, err := os.Stat(deployPath); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Specified folder does not exist"})
		return
	}

	// Deploy the manifests with workload label
	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun, dryRunStrategy, request.WorkloadLabel)
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
			"workload_label":   request.WorkloadLabel, // Store workload label in deployment data
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
			"workload_label": deploymentData["workload_label"], // Include workload label
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
	tempDir := fmt.Sprintf("/tmp/%d", time.Now().Unix())

	// Get access token from Redis
	gitToken, _ := redis.GetGitToken()

	// Always use false for dryRun and empty string for dryRunStrategy
	dryRun := false
	dryRunStrategy := ""

	// Clone the repository using token if available
	cloneURL := repoUrl
	if gitToken != "" {
		cloneURL = fmt.Sprintf("https://x-access-token:%s@%s", gitToken, repoUrl[8:])
	}

	// Clone the specific branch
	cmd := exec.Command("git", "clone", "-b", storedBranch, cloneURL, tempDir)
	if err := cmd.Run(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clone repo", "details": err.Error()})
		return
	}
	defer os.RemoveAll(tempDir)

	deployPath := tempDir
	if folderPath != "" {
		deployPath = filepath.Join(tempDir, folderPath)
	}

	if _, err := os.Stat(deployPath); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Specified folder does not exist"})
		return
	}

	// For webhook deployments, always deploy and store the data
	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun, dryRunStrategy, workloadLabel)
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
