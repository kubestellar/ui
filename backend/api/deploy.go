package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"github.com/kubestellar/ui/telemetry"
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/cli"
)

type DeployRequest struct {
	RepoURL       string `json:"repo_url" binding:"required"`
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
		FullName string `json:"full_name"`
	} `json:"repository"`
	Ref     string `json:"ref"` // Format: "refs/heads/main"
	Commits []struct {
		ID       string   `json:"id"`
		Message  string   `json:"message"`
		URL      string   `json:"url"`
		Modified []string `json:"modified"`
		Added    []string `json:"added"`
		Removed  []string `json:"removed"`
	} `json:"commits"`
	HeadCommit struct {
		ID      string `json:"id"`
		Message string `json:"message"`
		URL     string `json:"url"`
	} `json:"head_commit"`
}

// DeploymentStatus represents the status of a deployment
type DeploymentStatus struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// Improved error handling with custom error types
type APIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API Error %d: %s", e.Code, e.Message)
}

// HTTP client with timeout for better reliability
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
}

// Improved GitHub API fetching with better error handling and rate limiting awareness
func fetchGitHubYAMLs(repoURL, folderPath, branch, gitUsername, gitToken string) (map[string][]byte, error) {
	// Validate inputs
	if repoURL == "" {
		return nil, &APIError{Code: http.StatusBadRequest, Message: "Repository URL is required"}
	}

	if branch == "" {
		branch = "main"
	}

	// Extract owner and repo from the GitHub URL with better validation
	urlParts := strings.Split(strings.TrimSuffix(repoURL, ".git"), "/")
	if len(urlParts) < 2 {
		return nil, &APIError{Code: http.StatusBadRequest, Message: "Invalid GitHub repository URL format"}
	}

	ownerRepo := fmt.Sprintf("%s/%s", urlParts[len(urlParts)-2], urlParts[len(urlParts)-1])

	// Prepare the GitHub API URL to fetch directory contents
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s?ref=%s",
		ownerRepo, folderPath, branch)

	// Create request with context for timeout control
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to create request", Details: err.Error()}
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "KubeStellar-UI/1.0")

	// Add authentication with improved handling
	if gitToken != "" {
		if gitUsername != "" {
			req.SetBasicAuth(gitUsername, gitToken)
		} else {
			req.Header.Set("Authorization", "token "+gitToken)
		}
	}

	// Make the request with improved error handling
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, &APIError{Code: http.StatusBadGateway, Message: "Failed to fetch repository contents", Details: err.Error()}
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to read API response", Details: err.Error()}
	}

	// Enhanced error handling for different HTTP status codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Continue processing
	case http.StatusNotFound:
		return nil, &APIError{Code: http.StatusNotFound, Message: "Repository or path not found", Details: string(bodyBytes)}
	case http.StatusForbidden:
		return nil, &APIError{Code: http.StatusForbidden, Message: "Access denied - check authentication", Details: string(bodyBytes)}
	case http.StatusUnauthorized:
		return nil, &APIError{Code: http.StatusUnauthorized, Message: "Authentication required", Details: string(bodyBytes)}
	default:
		return nil, &APIError{Code: resp.StatusCode, Message: "GitHub API error", Details: string(bodyBytes)}
	}

	// Try to parse as a directory first
	var dirContents GitHubDirectoryResponse
	if err := json.Unmarshal(bodyBytes, &dirContents); err != nil {
		// If not a directory, it might be a single file
		var fileContent GitHubContentResponse
		if err := json.Unmarshal(bodyBytes, &fileContent); err != nil {
			return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to parse GitHub API response", Details: err.Error()}
		}

		// If it's a single YAML file, process it
		if isYAMLFile(fileContent.Name) {
			decodedContent, err := base64.StdEncoding.DecodeString(fileContent.Content)
			if err != nil {
				return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to decode file content", Details: err.Error()}
			}
			return map[string][]byte{fileContent.Path: decodedContent}, nil
		}
		return map[string][]byte{}, nil
	}

	// Process directory contents with concurrent fetching for better performance
	return fetchYAMLFilesFromDirectory(dirContents, gitUsername, gitToken)
}

// Helper function to check if file is YAML
func isYAMLFile(filename string) bool {
	return strings.HasSuffix(strings.ToLower(filename), ".yaml") || strings.HasSuffix(strings.ToLower(filename), ".yml")
}

// FetchGitHubYAMLs fetches YAML files from a GitHub repository directory without cloning
// Exported function for use in routes and other packages
func FetchGitHubYAMLs(repoURL, folderPath, branch, gitUsername, gitToken string) (map[string][]byte, error) {
	// Validate inputs
	if repoURL == "" {
		return nil, &APIError{Code: http.StatusBadRequest, Message: "Repository URL is required"}
	}

	if branch == "" {
		branch = "main"
	}

	// Extract owner and repo from the GitHub URL with better validation
	urlParts := strings.Split(strings.TrimSuffix(repoURL, ".git"), "/")
	if len(urlParts) < 2 {
		return nil, &APIError{Code: http.StatusBadRequest, Message: "Invalid GitHub repository URL format"}
	}

	ownerRepo := fmt.Sprintf("%s/%s", urlParts[len(urlParts)-2], urlParts[len(urlParts)-1])

	// Prepare the GitHub API URL to fetch directory contents
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/contents/%s?ref=%s",
		ownerRepo, folderPath, branch)

	// Create request with context for timeout control
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
	if err != nil {
		return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to create request", Details: err.Error()}
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "KubeStellar-UI/1.0")

	// Add authentication with improved handling
	if gitToken != "" {
		if gitUsername != "" {
			req.SetBasicAuth(gitUsername, gitToken)
		} else {
			req.Header.Set("Authorization", "token "+gitToken)
		}
	}

	// Make the request with improved error handling
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, &APIError{Code: http.StatusBadGateway, Message: "Failed to fetch repository contents", Details: err.Error()}
	}
	defer resp.Body.Close()

	bodyBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to read API response", Details: err.Error()}
	}

	// Enhanced error handling for different HTTP status codes
	switch resp.StatusCode {
	case http.StatusOK:
		// Continue processing
	case http.StatusNotFound:
		return nil, &APIError{Code: http.StatusNotFound, Message: "Repository or path not found", Details: string(bodyBytes)}
	case http.StatusForbidden:
		return nil, &APIError{Code: http.StatusForbidden, Message: "Access denied - check authentication", Details: string(bodyBytes)}
	case http.StatusUnauthorized:
		return nil, &APIError{Code: http.StatusUnauthorized, Message: "Authentication required", Details: string(bodyBytes)}
	default:
		return nil, &APIError{Code: resp.StatusCode, Message: "GitHub API error", Details: string(bodyBytes)}
	}

	// Try to parse as a directory first
	var dirContents GitHubDirectoryResponse
	if err := json.Unmarshal(bodyBytes, &dirContents); err != nil {
		// If not a directory, it might be a single file
		var fileContent GitHubContentResponse
		if err := json.Unmarshal(bodyBytes, &fileContent); err != nil {
			return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to parse GitHub API response", Details: err.Error()}
		}

		// If it's a single YAML file, process it
		if isYAMLFile(fileContent.Name) {
			decodedContent, err := base64.StdEncoding.DecodeString(fileContent.Content)
			if err != nil {
				return nil, &APIError{Code: http.StatusInternalServerError, Message: "Failed to decode file content", Details: err.Error()}
			}
			return map[string][]byte{fileContent.Path: decodedContent}, nil
		}
		return map[string][]byte{}, nil
	}

	// Process directory contents with concurrent fetching for better performance
	return fetchYAMLFilesFromDirectory(dirContents, gitUsername, gitToken)
}

// Concurrent fetching of YAML files for better performance
func fetchYAMLFilesFromDirectory(dirContents GitHubDirectoryResponse, gitUsername, gitToken string) (map[string][]byte, error) {
	yamlFiles := make(map[string][]byte)
	var mu sync.Mutex
	var wg sync.WaitGroup
	errChan := make(chan error, len(dirContents))

	// Limit concurrent requests to avoid rate limiting
	semaphore := make(chan struct{}, 5)

	for _, item := range dirContents {
		if item.Type == "file" && isYAMLFile(item.Name) {
			wg.Add(1)
			go func(item struct {
				Name        string `json:"name"`
				Path        string `json:"path"`
				SHA         string `json:"sha"`
				Size        int    `json:"size"`
				URL         string `json:"url"`
				HTMLURL     string `json:"html_url"`
				GitURL      string `json:"git_url"`
				DownloadURL string `json:"download_url"`
				Type        string `json:"type"`
			}) {
				defer wg.Done()
				semaphore <- struct{}{}        // Acquire semaphore
				defer func() { <-semaphore }() // Release semaphore

				content, err := fetchSingleFile(item.URL, gitUsername, gitToken)
				if err != nil {
					errChan <- err
					return
				}

				mu.Lock()
				yamlFiles[item.Path] = content
				mu.Unlock()
			}(item)
		}
	}

	wg.Wait()
	close(errChan)

	// Check for errors
	if len(errChan) > 0 {
		return nil, <-errChan
	}

	return yamlFiles, nil
}

// Helper function to fetch a single file
func fetchSingleFile(fileURL, gitUsername, gitToken string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", fileURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "KubeStellar-UI/1.0")

	if gitToken != "" {
		if gitUsername != "" {
			req.SetBasicAuth(gitUsername, gitToken)
		} else {
			req.Header.Set("Authorization", "token "+gitToken)
		}
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch file: %s", resp.Status)
	}

	fileBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var fileContent GitHubContentResponse
	if err := json.Unmarshal(fileBytes, &fileContent); err != nil {
		return nil, err
	}

	return base64.StdEncoding.DecodeString(fileContent.Content)
}

// Improved deployment validation
func validateDeployRequest(request *DeployRequest) error {
	if request.RepoURL == "" {
		return &APIError{Code: http.StatusBadRequest, Message: "repo_url is required"}
	}

	// Validate GitHub URL format
	if !strings.Contains(request.RepoURL, "github.com") {
		return &APIError{Code: http.StatusBadRequest, Message: "Only GitHub repositories are supported"}
	}

	return nil
}

// Generate deployment ID with better uniqueness
func generateDeploymentID(repoURL, deploymentType string) string {
	timestamp := time.Now().Format("20060102150405")
	repoName := filepath.Base(strings.TrimSuffix(repoURL, ".git"))
	return fmt.Sprintf("github-%s-%s-%s", deploymentType, repoName, timestamp)
}

// DeployHandler handles deployment requests with improved error handling and validation
func DeployHandler(c *gin.Context) {
	var request DeployRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/deploy", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate request
	if err := validateDeployRequest(&request); err != nil {
		if apiErr, ok := err.(*APIError); ok {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/deploy", fmt.Sprintf("%d", apiErr.Code)).Inc()
			c.JSON(apiErr.Code, gin.H{
				"error":   apiErr.Message,
				"details": apiErr.Details,
			})
		} else {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/deploy", "400").Inc()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// Extract and validate query parameters
	dryRun := c.Query("dryRun") == "true"
	dryRunStrategy := c.Query("dryRunStrategy")
	gitUsername := c.Query("git_username")
	gitToken := c.Query("git_token")
	branch := c.Query("branch")
	createdByMe := c.Query("created_by_me") == "true"
	deploymentID := c.Query("id")

	if branch == "" {
		branch = "main"
	}

	// Auto-generate workload label if not provided
	if request.WorkloadLabel == "" {
		repoBase := filepath.Base(strings.TrimSuffix(request.RepoURL, ".git"))
		request.WorkloadLabel = strings.ToLower(repoBase)
	}

	// Save deployment configuration in Redis with error handling
	if err := saveDeploymentConfig(request, branch, gitToken); err != nil {
		log.Printf("Warning: Failed to save deployment config to Redis: %v", err)
	}

	// Generate unique deployment ID
	if deploymentID == "" {
		deploymentID = generateDeploymentID(request.RepoURL, "manual")
	}

	// Perform deployment with better error handling
	deploymentTree, err := performDeployment(request, branch, gitUsername, gitToken, dryRun, dryRunStrategy)
	if err != nil {
		telemetry.GithubDeploymentsTotal.WithLabelValues("manual", "failure").Inc()
		if apiErr, ok := err.(*APIError); ok {
			c.JSON(apiErr.Code, gin.H{
				"error":   apiErr.Message,
				"details": apiErr.Details,
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Deployment failed",
				"details": err.Error(),
			})
		}
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/deploy", "500").Inc()
		return
	}

	// Store deployment data if requested
	var storageError error
	if createdByMe {
		deploymentData := createDeploymentData(deploymentID, request, branch, dryRun, dryRunStrategy, deploymentTree)
		storageError = storeDeploymentData(deploymentData)
	}

	// Prepare response
	response := gin.H{
		"message": func() string {
			if dryRun {
				return "Dry run successful. No changes applied."
			}
			return "Deployment successful"
		}(),
		"deployment_id":    deploymentID,
		"workload_label":   request.WorkloadLabel,
		"deployment_tree":  deploymentTree,
		"dry_run":          dryRun,
		"dry_run_strategy": dryRunStrategy,
		"stored":           createdByMe && storageError == nil,
	}

	if createdByMe {
		if storageError != nil {
			response["storage_warning"] = fmt.Sprintf("Deployment succeeded but failed to store metadata: %v", storageError)
		} else {
			response["storage_details"] = "Deployment data stored in ConfigMap for future reference"
		}
	}
	telemetry.GithubDeploymentsTotal.WithLabelValues("manual", "success").Inc()
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/deploy", "200").Inc()
	c.JSON(http.StatusOK, response)
}

// Helper function to save deployment configuration
func saveDeploymentConfig(request DeployRequest, branch, gitToken string) error {
	var errors []error

	if err := redis.SetFilePath(request.FolderPath); err != nil {
		errors = append(errors, err)
	}
	if err := redis.SetRepoURL(request.RepoURL); err != nil {
		errors = append(errors, err)
	}
	if err := redis.SetBranch(branch); err != nil {
		errors = append(errors, err)
	}
	if err := redis.SetGitToken(gitToken); err != nil {
		errors = append(errors, err)
	}
	if err := redis.SetWorkloadLabel(request.WorkloadLabel); err != nil {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		return fmt.Errorf("multiple Redis errors: %v", errors)
	}
	return nil
}

// Helper function to perform deployment
func performDeployment(request DeployRequest, branch, gitUsername, gitToken string, dryRun bool, dryRunStrategy string) (interface{}, error) {
	tempDir := fmt.Sprintf("/tmp/deploy-%d", time.Now().UnixNano())
	cloneURL := request.RepoURL

	// Prepare authenticated clone URL
	if gitUsername != "" && gitToken != "" {
		cloneURL = fmt.Sprintf("https://%s:%s@%s", gitUsername, gitToken, request.RepoURL[8:])
	} else if gitToken != "" {
		cloneURL = fmt.Sprintf("https://x-access-token:%s@%s", gitToken, request.RepoURL[8:])
	}

	// Clone repository with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "git", "clone", "-b", branch, "--depth", "1", cloneURL, tempDir)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0") // Disable interactive prompts

	if err := cmd.Run(); err != nil {
		return nil, &APIError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to clone repository",
			Details: fmt.Sprintf("Branch: %s, Error: %v", branch, err),
		}
	}
	defer os.RemoveAll(tempDir)

	// Determine deployment path
	deployPath := tempDir
	if request.FolderPath != "" {
		deployPath = filepath.Join(tempDir, request.FolderPath)
	}

	// Validate deployment path exists
	if _, err := os.Stat(deployPath); os.IsNotExist(err) {
		return nil, &APIError{
			Code:    http.StatusBadRequest,
			Message: "Specified folder does not exist in repository",
			Details: fmt.Sprintf("Path: %s", request.FolderPath),
		}
	}

	// Deploy manifests
	return k8s.DeployManifests(deployPath, dryRun, dryRunStrategy, request.WorkloadLabel)
}

// Helper function to create deployment data
func createDeploymentData(deploymentID string, request DeployRequest, branch string, dryRun bool, dryRunStrategy string, deploymentTree interface{}) map[string]interface{} {
	return map[string]interface{}{
		"id":               deploymentID,
		"timestamp":        time.Now().Format(time.RFC3339),
		"repo_url":         request.RepoURL,
		"folder_path":      request.FolderPath,
		"branch":           branch,
		"dry_run":          dryRun,
		"dry_run_strategy": dryRunStrategy,
		"created_by_me":    true,
		"workload_label":   request.WorkloadLabel,
		"deployment_tree":  deploymentTree,
	}
}

// Helper function to store deployment data
func storeDeploymentData(deploymentData map[string]interface{}) error {
	// Get existing deployments
	existingDeployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		existingDeployments = []interface{}{}
	}

	// Add new deployment
	existingDeployments = append(existingDeployments, deploymentData)

	// Convert to JSON
	deploymentsJSON, err := json.Marshal(existingDeployments)
	if err != nil {
		return fmt.Errorf("failed to marshal deployments: %v", err)
	}

	// Store in ConfigMap
	cmData := map[string]string{
		"deployments": string(deploymentsJSON),
	}

	return k8s.StoreGitHubDeployment(cmData)
}

// Improved webhook handler with better validation and error handling
func GitHubWebhookHandler(c *gin.Context) {
	// Parse webhook payload with better error handling
	var request GitHubWebhookPayload

	// Try direct JSON parsing first
	if err := c.ShouldBindJSON(&request); err != nil {
		// If direct parsing fails, try the wrapped format
		var webhookWrapper struct {
			Payload string `json:"payload"`
		}

		if err := c.ShouldBindJSON(&webhookWrapper); err != nil {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "400").Inc()
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid webhook payload format",
				"details": err.Error(),
			})
			return
		}

		// Parse the inner payload JSON string
		if err := json.Unmarshal([]byte(webhookWrapper.Payload), &request); err != nil {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "400").Inc()
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Failed to parse webhook payload",
				"details": err.Error(),
			})
			return
		}
	}

	// Validate webhook payload
	if request.Repository.CloneURL == "" {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Repository clone URL is missing from webhook payload"})
		return
	}

	// Get deployment configuration from Redis with better error handling
	config, err := getWebhookConfig()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "500").Inc()
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "No deployment configured for this repository",
			"details": err.Error(),
		})
		return
	}

	// Validate branch
	branchFromRef := strings.TrimPrefix(request.Ref, "refs/heads/")
	if branchFromRef != config.Branch {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "200").Inc()
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Ignoring push to branch '%s'. Configured branch is '%s'", branchFromRef, config.Branch),
		})
		return
	}

	// Check for relevant changes
	relevantChanges, changedFiles := checkRelevantChanges(request.Commits, config.FolderPath)
	if !relevantChanges {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "200").Inc()
		c.JSON(http.StatusOK, gin.H{
			"message": "No relevant changes detected in the specified folder path",
		})
		return
	}

	// Perform webhook deployment
	deploymentResult, err := performWebhookDeployment(request, config)
	if err != nil {
		if apiErr, ok := err.(*APIError); ok {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", fmt.Sprintf("%d", apiErr.Code)).Inc()
			c.JSON(apiErr.Code, gin.H{
				"error":   apiErr.Message,
				"details": apiErr.Details,
			})
		} else {
			telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/webhook/github", "500").Inc()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Webhook deployment failed",
				"details": err.Error(),
			})
		}
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/webhook/github", "200").Inc()
	c.JSON(http.StatusOK, gin.H{
		"message":         "Webhook deployment successful",
		"deployment_id":   deploymentResult.ID,
		"deployment_tree": deploymentResult.Tree,
		"changed_files":   changedFiles,
		"commit_id":       request.HeadCommit.ID,
		"workload_label":  config.WorkloadLabel,
		"storage_details": "Deployment data stored in ConfigMap",
	})
}

// Configuration struct for webhook handling
type WebhookConfig struct {
	FolderPath    string
	Branch        string
	WorkloadLabel string
	GitToken      string
}

type DeploymentResult struct {
	ID   string
	Tree interface{}
}

// Helper function to get webhook configuration
func getWebhookConfig() (*WebhookConfig, error) {
	config := &WebhookConfig{}
	var err error

	config.FolderPath, err = redis.GetFilePath()
	if err != nil {
		return nil, fmt.Errorf("failed to get folder path: %v", err)
	}

	config.Branch, err = redis.GetBranch()
	if err != nil {
		config.Branch = "main" // Default branch
	}

	config.WorkloadLabel, err = redis.GetWorkloadLabel()
	if err != nil {
		config.WorkloadLabel = "" // Will be generated later
	}

	config.GitToken, _ = redis.GetGitToken() // Optional

	return config, nil
}

// Helper function to check for relevant changes
func checkRelevantChanges(commits []struct {
	ID       string   `json:"id"`
	Message  string   `json:"message"`
	URL      string   `json:"url"`
	Modified []string `json:"modified"`
	Added    []string `json:"added"`
	Removed  []string `json:"removed"`
}, folderPath string) (bool, []string) {
	var changedFiles []string

	// If folderPath is empty, any change is relevant
	if folderPath == "" {
		return len(commits) > 0, changedFiles
	}

	// Check each commit for changes in the relevant folder
	for _, commit := range commits {
		// Check all types of changes: modified, added, removed
		allFiles := append(append(commit.Modified, commit.Added...), commit.Removed...)

		for _, file := range allFiles {
			if strings.HasPrefix(file, folderPath) && isYAMLFile(file) {
				changedFiles = append(changedFiles, file)
			}
		}
	}

	return len(changedFiles) > 0, changedFiles
}

// Helper function to perform webhook deployment
func performWebhookDeployment(request GitHubWebhookPayload, config *WebhookConfig) (*DeploymentResult, error) {
	repoURL := request.Repository.CloneURL
	tempDir := fmt.Sprintf("/tmp/webhook-%d", time.Now().UnixNano())

	// Generate workload label if not configured
	if config.WorkloadLabel == "" {
		repoName := filepath.Base(strings.TrimSuffix(repoURL, ".git"))
		config.WorkloadLabel = strings.ToLower(repoName)
	}

	// Prepare clone URL with authentication
	cloneURL := repoURL
	if config.GitToken != "" {
		cloneURL = fmt.Sprintf("https://x-access-token:%s@%s", config.GitToken, repoURL[8:])
	}

	// Clone repository with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "git", "clone", "-b", config.Branch, "--depth", "1", cloneURL, tempDir)
	cmd.Env = append(os.Environ(), "GIT_TERMINAL_PROMPT=0")

	if err := cmd.Run(); err != nil {
		return nil, &APIError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to clone repository for webhook deployment",
			Details: err.Error(),
		}
	}
	defer os.RemoveAll(tempDir)

	// Determine deployment path
	deployPath := tempDir
	if config.FolderPath != "" {
		deployPath = filepath.Join(tempDir, config.FolderPath)
	}

	// Validate path exists
	if _, err := os.Stat(deployPath); os.IsNotExist(err) {
		return nil, &APIError{
			Code:    http.StatusBadRequest,
			Message: "Specified folder does not exist in repository",
			Details: config.FolderPath,
		}
	}

	// Deploy manifests (always live deployment for webhooks)
	deploymentTree, err := k8s.DeployManifests(deployPath, false, "", config.WorkloadLabel)
	if err != nil {
		return nil, fmt.Errorf("deployment failed: %v", err)
	}

	// Generate deployment ID and store data
	deploymentID := generateDeploymentID(repoURL, "webhook")

	// Store deployment data
	deploymentData := map[string]interface{}{
		"id":             deploymentID,
		"timestamp":      time.Now().Format(time.RFC3339),
		"repo_url":       repoURL,
		"folder_path":    config.FolderPath,
		"branch":         config.Branch,
		"webhook":        true,
		"commit_id":      request.HeadCommit.ID,
		"commit_message": request.HeadCommit.Message,
		"workload_label": config.WorkloadLabel,
	}

	if err := storeWebhookDeployment(deploymentData, deploymentTree); err != nil {
		log.Printf("Warning: Failed to store webhook deployment data: %v", err)
	}

	return &DeploymentResult{
		ID:   deploymentID,
		Tree: deploymentTree,
	}, nil
}

// Helper function to store webhook deployment
func storeWebhookDeployment(deploymentData map[string]interface{}, deploymentTree interface{}) error {
	// Get existing deployments
	existingDeployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		existingDeployments = []interface{}{}
	}

	// Add new deployment
	existingDeployments = append(existingDeployments, deploymentData)

	// Convert deployment tree to JSON
	deploymentTreeJSON, err := json.Marshal(deploymentTree)
	if err != nil {
		return fmt.Errorf("failed to marshal deployment tree: %v", err)
	}

	// Convert deployments to JSON
	deploymentsJSON, err := json.Marshal(existingDeployments)
	if err != nil {
		return fmt.Errorf("failed to marshal deployments: %v", err)
	}

	// Store in ConfigMap
	cmData := map[string]string{
		"deployments":          string(deploymentsJSON),
		"last_deployment_tree": string(deploymentTreeJSON),
	}

	return k8s.StoreGitHubDeployment(cmData)
}

// CreateHelmActionConfig initializes the Helm action configuration with better error handling
func CreateHelmActionConfig(namespace string) (*action.Configuration, error) {
	if namespace == "" {
		namespace = "default"
	}

	actionConfig := new(action.Configuration)
	helmSettings := cli.New()

	// Initialize with better error context
	if err := actionConfig.Init(helmSettings.RESTClientGetter(), namespace, "secret", log.Printf); err != nil {
		return nil, &APIError{
			Code:    http.StatusInternalServerError,
			Message: "Failed to initialize Helm configuration",
			Details: fmt.Sprintf("Namespace: %s, Error: %v", namespace, err),
		}
	}

	return actionConfig, nil
}

// Health check handler for monitoring deployment API status
func HealthCheckHandler(c *gin.Context) {
	// Check Redis connectivity
	redisStatus := "healthy"
	if _, err := redis.GetFilePath(); err != nil {
		redisStatus = fmt.Sprintf("unhealthy: %v", err)
	}

	// Check Kubernetes connectivity
	k8sStatus := "healthy"
	if _, err := k8s.GetGithubDeployments("its1"); err != nil {
		k8sStatus = fmt.Sprintf("unhealthy: %v", err)
	}

	// Overall health
	healthy := redisStatus == "healthy" && k8sStatus == "healthy"
	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"status": func() string {
			if healthy {
				return "healthy"
			} else {
				return "unhealthy"
			}
		}(),
		"timestamp": time.Now().Format(time.RFC3339),
		"components": gin.H{
			"redis":      redisStatus,
			"kubernetes": k8sStatus,
		},
		"version": "1.0.0",
	})
}

// Deployment status handler to check specific deployment status
func DeploymentStatusHandler(c *gin.Context) {
	deploymentID := c.Param("id")
	if deploymentID == "" {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/:id", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment ID is required"})
		return
	}

	// Get deployments from ConfigMap
	deployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/:"+deploymentID, "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve deployments",
			"details": err.Error(),
		})
		return
	}

	// Find the specific deployment
	for _, deployment := range deployments {
		if deploymentMap, ok := deployment.(map[string]interface{}); ok {
			if id, exists := deploymentMap["id"]; exists && id == deploymentID {
				c.JSON(http.StatusOK, gin.H{
					"deployment": deploymentMap,
					"found":      true,
				})
				telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/:"+deploymentID, "200").Inc()
				return
			}
		}
	}
	telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments/:"+deploymentID, "404").Inc()
	c.JSON(http.StatusNotFound, gin.H{
		"error": "Deployment not found",
		"id":    deploymentID,
		"found": false,
	})
}

// List all deployments handler
func ListDeploymentsHandler(c *gin.Context) {
	// Parse query parameters for filtering
	limit := 10 // default limit
	if l := c.Query("limit"); l != "" {
		if parsedLimit, err := fmt.Sscanf(l, "%d", &limit); err != nil || parsedLimit != 1 || limit <= 0 {
			limit = 10
		}
	}

	webhookOnly := c.Query("webhook_only") == "true"
	manualOnly := c.Query("manual_only") == "true"

	// Get deployments from ConfigMap
	deployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve deployments",
			"details": err.Error(),
		})
		return
	}

	// Filter and sort deployments
	var filteredDeployments []interface{}
	for _, deployment := range deployments {
		if deploymentMap, ok := deployment.(map[string]interface{}); ok {
			// Apply filters
			if webhookOnly {
				if webhook, exists := deploymentMap["webhook"]; !exists || webhook != true {
					continue
				}
			}
			if manualOnly {
				if webhook, exists := deploymentMap["webhook"]; exists && webhook == true {
					continue
				}
			}
			filteredDeployments = append(filteredDeployments, deployment)
		}
	}

	// Sort by timestamp (most recent first)
	// Note: This is a simplified sort. In production, you might want to use a proper sorting library

	// Apply limit
	if limit > 0 && len(filteredDeployments) > limit {
		filteredDeployments = filteredDeployments[:limit]
	}
	telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/deployments", "200").Inc()
	c.JSON(http.StatusOK, gin.H{
		"deployments": filteredDeployments,
		"count":       len(filteredDeployments),
		"total":       len(deployments),
		"filters": gin.H{
			"webhook_only": webhookOnly,
			"manual_only":  manualOnly,
			"limit":        limit,
		},
	})
}

// Delete deployment handler
func DeleteDeploymentHandler(c *gin.Context) {
	deploymentID := c.Param("id")
	if deploymentID == "" {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/deployments/:id", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment ID is required"})
		return
	}

	// Get existing deployments
	deployments, err := k8s.GetGithubDeployments("its1")
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/deployments/:"+deploymentID, "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve deployments",
			"details": err.Error(),
		})
		return
	}

	// Filter out the deployment to delete
	var updatedDeployments []interface{}
	var found bool
	for _, deployment := range deployments {
		if deploymentMap, ok := deployment.(map[string]interface{}); ok {
			if id, exists := deploymentMap["id"]; exists && id == deploymentID {
				found = true
				continue // Skip this deployment (delete it)
			}
		}
		updatedDeployments = append(updatedDeployments, deployment)
	}

	if !found {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/deployments/:"+deploymentID, "404").Inc()
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Deployment not found",
			"id":    deploymentID,
		})
		return
	}

	// Save updated deployments
	deploymentsJSON, err := json.Marshal(updatedDeployments)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/deployments/:"+deploymentID, "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to marshal updated deployments",
			"details": err.Error(),
		})
		return
	}

	cmData := map[string]string{
		"deployments": string(deploymentsJSON),
	}

	if err := k8s.StoreGitHubDeployment(cmData); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("DELETE", "/api/deployments/:"+deploymentID, "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update deployment storage",
			"details": err.Error(),
		})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("DELETE", "/api/deployments/:"+deploymentID, "200").Inc()
	c.JSON(http.StatusOK, gin.H{
		"message":         "Deployment deleted successfully",
		"deleted_id":      deploymentID,
		"remaining_count": len(updatedDeployments),
	})
}

// Configuration validation handler
func ValidateConfigHandler(c *gin.Context) {
	var config struct {
		RepoURL    string `json:"repo_url" binding:"required"`
		FolderPath string `json:"folder_path"`
		Branch     string `json:"branch"`
		GitToken   string `json:"git_token"`
	}

	if err := c.ShouldBindJSON(&config); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate_config", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid configuration",
			"details": err.Error(),
		})
		return
	}

	// Set defaults
	if config.Branch == "" {
		config.Branch = "main"
	}

	// Validate repository access
	validationResults := gin.H{
		"repo_url":    config.RepoURL,
		"branch":      config.Branch,
		"folder_path": config.FolderPath,
		"validations": gin.H{},
	}

	// Test repository access
	_, err := fetchGitHubYAMLs(config.RepoURL, config.FolderPath, config.Branch, "", config.GitToken)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate_config", "400").Inc()
		validationResults["validations"].(gin.H)["repository_access"] = gin.H{
			"status": "failed",
			"error":  err.Error(),
		}
	} else {
		telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/validate_config", "200").Inc()
		validationResults["validations"].(gin.H)["repository_access"] = gin.H{
			"status": "passed",
		}
	}

	// Test Redis connectivity
	if err := redis.SetRepoURL("test"); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate_config", "500").Inc()
		validationResults["validations"].(gin.H)["redis_connectivity"] = gin.H{
			"status": "failed",
			"error":  err.Error(),
		}
	} else {
		telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/validate_config", "200").Inc()
		validationResults["validations"].(gin.H)["redis_connectivity"] = gin.H{
			"status": "passed",
		}
	}

	// Test Kubernetes connectivity
	if _, err := k8s.GetGithubDeployments("its1"); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/validate_config", "500").Inc()
		validationResults["validations"].(gin.H)["kubernetes_connectivity"] = gin.H{
			"status": "failed",
			"error":  err.Error(),
		}
	} else {
		telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/validate_config", "200").Inc()
		validationResults["validations"].(gin.H)["kubernetes_connectivity"] = gin.H{
			"status": "passed",
		}
	}

	// Overall validation status
	allPassed := true
	for _, validation := range validationResults["validations"].(gin.H) {
		if v, ok := validation.(gin.H); ok {
			if status, exists := v["status"]; exists && status != "passed" {
				allPassed = false
				break
			}
		}
	}

	validationResults["overall_status"] = func() string {
		if allPassed {
			return "valid"
		}
		return "invalid"
	}()

	statusCode := http.StatusOK
	if !allPassed {
		statusCode = http.StatusBadRequest
	}
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/validate_config", fmt.Sprintf("%d", statusCode)).Inc()
	c.JSON(statusCode, validationResults)
}
