package api

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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

	token := uuid.New().String()

	host := os.Getenv("HOST")
	if host == "" {
		host = "http://localhost:4000"
	}

	command := fmt.Sprintf(
		"curl -X POST %s/clusters/manual/callback -d '{\"clusterName\": \"%s\", \"token\": \"%s\"}'",
		host, req.ClusterName, token,
	)

	response := GenerateCommandResponse{
		ClusterName: req.ClusterName,
		Token:       token,
		Command:     command,
	}

	c.JSON(http.StatusOK, response)
}
