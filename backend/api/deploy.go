package api

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/k8s"
	"github.com/katamyra/kubestellarUI/redis"
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

	// Extract dryRun flag from query parameters
	dryRun := c.Query("dryRun") == "true"

	// Store repo & folder path in Redis for future auto-deployments
	redis.SetFilePath(request.FolderPath)
	redis.SetRepoURL(request.RepoURL)

	tempDir := fmt.Sprintf("/tmp/%d", time.Now().Unix())
	cmd := exec.Command("git", "clone", request.RepoURL, tempDir)
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

	// Deploy with dryRun option
	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	// If dry run, notify the user
	if dryRun {
		c.JSON(http.StatusOK, gin.H{
			"message":         "Dry run successful. No changes applied.",
			"deployment_tree": deploymentTree,
		})
		return
	}

	// Return actual deployment result
	c.JSON(http.StatusOK, deploymentTree)
}

// GitHubWebhookHandler processes GitHub webhook events
func GitHubWebhookHandler(c *gin.Context) {
	var request GitHubWebhookPayload

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid webhook payload", "details": err.Error()})
		return
	}

	// Retrieve stored deployment path for this repo
	folderPath, err := redis.GetFilePath()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No deployment configured for this repository"})
		return
	}

	repoUrl := request.Repository.CloneURL
	tempDir := fmt.Sprintf("/tmp/%d", time.Now().Unix())
	cmd := exec.Command("git", "clone", repoUrl, tempDir)
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

	// Check for dry run parameter
	dryRun := c.Query("dryRun") == "true"
	deploymentTree, err := k8s.DeployManifests(deployPath, dryRun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	if dryRun {
		c.JSON(http.StatusOK, gin.H{"message": "Dry run successful", "deployment": deploymentTree})
		return
	}

	c.JSON(http.StatusOK, deploymentTree)
}
