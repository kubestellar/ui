package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"go.uber.org/zap"
)

// FIXED: OnboardingLogsHandler with proper variable references
func OnboardingLogsHandler(c *gin.Context) {
	clusterName := c.Param("cluster")
	if clusterName == "" {
		log.LogError("Cluster name is required")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	log.LogInfo("Fetching cluster name",
		zap.String("cluster", clusterName))

	// Get all events for this cluster
	events := GetOnboardingEvents(clusterName)
	log.LogInfo("Getting onboarding events",
		zap.Int("count", len(events)),
		zap.String("cluster", clusterName))

	// Get current status - FIX: Use the correct mutex variable name
	mutex.RLock()
	status, exists := clusterStatuses[clusterName]
	mutex.RUnlock()

	log.LogInfo("Checking cluster status",
		zap.String("cluster", clusterName),
		zap.String("status", status),
		zap.Bool("exists", exists))

	// If no status exists but we have events, derive status from events
	if !exists && len(events) > 0 {
		lastEvent := events[len(events)-1]
		status = lastEvent.Status
		exists = true
		log.LogInfo("Derived cluster status from events",
			zap.String("cluster", clusterName),
			zap.String("status", status))

	}

	// Check if onboarding is in progress
	onboardingMutex.RLock()
	inProgress := onboardingInProgress[clusterName]
	onboardingMutex.RUnlock()
	log.LogInfo("Checking for onboarding if its in progress",
		zap.String("cluster", clusterName),
		zap.Bool("inProgress: ", inProgress))

	if inProgress {
		status = "InProgress"
		exists = true
		log.LogInfo("status is marked as InProgress",
			zap.String("cluster", clusterName),
			zap.String("status", status))
	}

	// Return data even if no formal status exists but we have events
	if !exists && len(events) == 0 {
		log.LogError("No onboarding data found for cluster", zap.String("cluster", clusterName))
		c.JSON(http.StatusNotFound, gin.H{"error": "No onboarding data found for cluster"})
		return
	}

	// If no formal status but we have events, set a default status
	if !exists {
		status = "Unknown"
		log.LogInfo("Setting default unknown status for cluster if no formal status found but we have events",
			zap.String("cluster", clusterName),
			zap.String("status", status))
	}

	log.LogInfo("Returning onboarding logs response",
		zap.String("cluster", clusterName),
		zap.String("status", status),
		zap.Int("logCount", len(events)),
		zap.Any("events", events))

	c.JSON(http.StatusOK, gin.H{
		"clusterName": clusterName,
		"status":      status,
		"logs":        events,
		"count":       len(events),
		"inProgress":  inProgress,
		"lastUpdated": time.Now(),
	})
}
