package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

func setupPluginRoutes(router *gin.Engine) {
	// Plugin management API endpoints
	pluginAPI := router.Group("/api/plugins")
	{
		// Core plugin operations
		pluginAPI.POST("/load", api.LoadPluginHandler)
		pluginAPI.GET("/", api.ListPluginsHandler)
		pluginAPI.GET("/:id", api.GetPluginHandler)
		pluginAPI.DELETE("/:id", api.UnloadPluginHandler)
		pluginAPI.POST("/:id/reload", api.ReloadPluginHandler)
		pluginAPI.POST("/:id/update", api.UpdatePluginHandler)

		// Plugin status and health
		pluginAPI.GET("/:id/status", api.GetPluginStatusHandler)
		pluginAPI.GET("/health/summary", api.GetHealthSummaryHandler)

		// Plugin control
		pluginAPI.POST("/:id/enable", api.EnablePluginHandler)
		pluginAPI.POST("/:id/disable", api.DisablePluginHandler)

		// Plugin discovery and validation
		pluginAPI.GET("/available", api.GetAvailablePluginsHandler)
		pluginAPI.POST("/validate", api.ValidatePluginHandler)

		// System operations
		pluginAPI.GET("/system/metrics", api.GetSystemMetricsHandler)
		pluginAPI.GET("/system/configuration", api.GetConfigurationHandler)
		pluginAPI.PUT("/system/configuration", api.UpdateConfigurationHandler)

		// Cache management
		pluginAPI.GET("/cache/info", api.GetCacheInfoHandler)
		pluginAPI.DELETE("/cache", api.ClearCacheHandler)
	}
}
