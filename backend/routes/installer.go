package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
)

func setupInstallerRoutes(router *gin.Engine, apiGroup *gin.RouterGroup, wsGroup *gin.RouterGroup) {
	// Public routes for initial setup (no authentication required)
	router.GET("/api/prerequisites", api.CheckPrerequisitesHandler)
	router.GET("/api/kubestellar/status", api.CheckKubeStellarStatusHandler)

	// Protected routes (require authentication)
	apiGroup.POST("/install", api.InstallHandler)
	apiGroup.GET("/logs/:id", api.GetLogsHandler)
	wsGroup.GET("/logs/:id", api.LogsWebSocketHandler)
}
