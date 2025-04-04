package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

func setupInstallerRoutes(router *gin.Engine) {
	// API Routes
	router.GET("/api/prerequisites", api.CheckPrerequisitesHandler)
	router.POST("/api/install", api.InstallHandler)
	router.GET("/api/logs/:id", api.GetLogsHandler)
	router.GET("/api/ws/logs/:id", api.LogsWebSocketHandler)
	// Add new status check endpoint
	router.GET("/api/kubestellar/status", api.CheckKubeStellarStatusHandler)
}
