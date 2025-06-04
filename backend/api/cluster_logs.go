package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// FIXED: OnboardingLogsHandler with proper variable references
func OnboardingLogsHandler(c *gin.Context) {
	clusterName := c.Param("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Get all events for this cluster
	events := GetOnboardingEvents(clusterName)

	// Get current status - FIX: Use the correct mutex variable name
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	// If no status exists but we have events, derive status from events
	if !exists && len(events) > 0 {
		lastEvent := events[len(events)-1]
		status = lastEvent.Status
		exists = true
	}

	// Check if onboarding is in progress
	onboardingMutex.RLock()
	inProgress := onboardingInProgress[clusterName]
	onboardingMutex.RUnlock()

	if inProgress {
		status = "InProgress"
		exists = true
	}

	// Return data even if no formal status exists but we have events
	if !exists && len(events) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "No onboarding data found for cluster"})
		return
	}

	// If no formal status but we have events, set a default status
	if !exists {
		status = "Unknown"
	}

	c.JSON(http.StatusOK, gin.H{
		"clusterName": clusterName,
		"status":      status,
		"logs":        events,
		"count":       len(events),
		"inProgress":  inProgress,
		"lastUpdated": time.Now(),
	})
}
