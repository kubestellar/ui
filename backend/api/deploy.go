package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
)

type DeployRequest struct {
	RepoURL    string `json:"repo_url"`
	FolderPath string `json:"folder_path"`
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
	if branch == "" {
		branch = "main" // Default branch
	}

	// Store repo, folder path & branch in Redis for future auto-deployments
	redis.SetFilePath(request.FolderPath)
	redis.SetRepoURL(request.RepoURL)
	redis.SetBranch(branch)
	redis.SetGitToken(gitToken)

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

	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun, dryRunStrategy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	if dryRun {
		c.JSON(http.StatusOK, gin.H{"message": "Dry run successful. No changes applied.", "dryRunStrategy": dryRunStrategy, "deployment_tree": deploymentTree})
		return
	}

	c.JSON(http.StatusOK, deploymentTree)
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

	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun, dryRunStrategy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Deployment successful",
		"deployment":    deploymentTree,
		"changed_files": changedFiles,
	})
}
