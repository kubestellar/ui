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
)

type DeployRequest struct {
	RepoURL    string `json:"repo_url"`
	FolderPath string `json:"folder_path"`
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

	deploymentTree, err := k8s.DeployManifests(deployPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Deployment failed", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, deploymentTree)
}
