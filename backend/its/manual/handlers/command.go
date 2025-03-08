package handlers

import (
	"context"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type GenerateCommandRequest struct {
	ClusterName string `json:"clusterName" binding:"required"`
}

type GenerateCommandResponse struct {
	ClusterName string `json:"clusterName"`
	Token       string `json:"token"`
	Command     string `json:"command"`
}

func GenerateCommandHandler(c *gin.Context) {
	var req GenerateCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload: " + err.Error()})
		return
	}

	// Create a context with a timeout to prevent hanging.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Run the command to get the token.
	cmd := exec.CommandContext(ctx, "clusteradm", "--context", "its1", "get", "token")
	output, err := cmd.CombinedOutput()
	outputStr := strings.TrimSpace(string(output))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to get token: %s, output: %s", err.Error(), outputStr),
		})
		return
	}

	// Look for the line that starts with "token=" and extract the token.
	var token string
	lines := strings.Split(outputStr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "token=") {
			token = strings.TrimPrefix(line, "token=")
			token = strings.TrimSpace(token)
			break
		}
	}

	if token == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token not found in command output"})
		return
	}

	// Build the join command using the extracted token and the provided cluster name.
	joinCommand := fmt.Sprintf(
		"clusteradm join --hub-token %s --hub-apiserver https://its1.localtest.me:9443 --cluster-name %s",
		token, req.ClusterName,
	)

	response := GenerateCommandResponse{
		ClusterName: req.ClusterName,
		Token:       token,
		Command:     joinCommand,
	}

	c.JSON(http.StatusOK, response)
}
