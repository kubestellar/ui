package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
)

// setupPluginRoutes registers all plugin management routes
func setupPluginRoutes(router *gin.Engine) {
	plugins := router.Group("/api/plugins")
	{
		// Plugin Management
		plugins.GET("", api.ListPluginsHandler)
		plugins.GET("/:id", api.GetPluginDetailsHandler)
		plugins.POST("/install", api.InstallPluginHandler)
		plugins.DELETE("/:id", api.UninstallPluginHandler)
		plugins.POST("/:id/reload", api.ReloadPluginHandler)
		plugins.GET("/manifests", api.GetAllPluginManifestsHandler)

		// Plugin Control
		plugins.POST("/:id/enable", api.EnablePluginHandler)
		plugins.POST("/:id/disable", api.DisablePluginHandler)
		plugins.GET("/:id/status", api.GetPluginStatusHandler)

		// System Operations
		plugins.GET("/system/metrics", api.GetPluginSystemMetricsHandler)
		plugins.GET("/system/configuration", api.GetPluginSystemConfigHandler)
		plugins.PUT("/system/configuration", api.UpdatePluginSystemConfigHandler)

		// Feedback
		plugins.POST("/feedback", api.SubmitPluginFeedbackHandler)
	}
}
