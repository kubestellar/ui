package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OnboardingLogsHandler returns all logs for a specific cluster's onboarding process
func OnboardingLogsHandler(c *gin.Context) {
	clusterName := c.Param("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Get all events for this cluster
	events := GetOnboardingEvents(clusterName)

	// Get current status
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "No onboarding data found for cluster"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clusterName": clusterName,
		"status":      status,
		"logs":        events,
		"count":       len(events),
	})
}
