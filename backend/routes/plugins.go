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
		pluginAPI.GET("/system/configuration", api.GetConfigurationHandler)
		pluginAPI.PUT("/system/configuration", api.UpdateConfigurationHandler)

		// Cache management
		pluginAPI.GET("/cache/info", api.GetCacheInfoHandler)
		pluginAPI.DELETE("/cache", api.ClearCacheHandler)

		// GitHub Repository Installation
		githubAPI := pluginAPI.Group("/github")
		{
			githubAPI.POST("/install", api.InstallGitHubRepositoryHandler)
			githubAPI.POST("/update", api.UpdateGitHubRepositoryHandler)
		}

		// Local Plugin Development
		localAPI := pluginAPI.Group("/local")
		{
			localAPI.POST("/load", api.LoadLocalPluginHandler)
			localAPI.POST("/unload", api.UnloadLocalPluginHandler)
			localAPI.GET("/list", api.ListLocalPluginsHandler)
			localAPI.GET("/build", api.BuildLocalPluginHandler)
		}

		// Upload-based plugin installation
		pluginAPI.POST("/upload", api.UploadPluginZipHandler)
		pluginAPI.POST("/install/:uploadId", api.InstallUploadedPluginHandler)

		// Cluster Operations Plugin Routes (using real handlers)
		clusterOps := pluginAPI.Group("/cluster-ops-plugin")
		{
			clusterOps.POST("/onboard", api.OnboardClusterHandler)
			clusterOps.POST("/detach", func(c *gin.Context) {
				c.JSON(501, gin.H{"error": "Detach functionality not yet implemented in handlers.go"})
			})
			clusterOps.GET("/status/:cluster", api.GetClusterStatusHandler)
			clusterOps.GET("/clusters", api.GetClusterStatusHandler) // Returns all cluster statuses
			clusterOps.GET("/health", func(c *gin.Context) {
				c.JSON(200, gin.H{
					"status":  "healthy",
					"message": "Cluster operations are functioning",
				})
			})
			clusterOps.GET("/events/:cluster", func(c *gin.Context) {
				// Could be implemented later to show onboarding events
				c.JSON(200, gin.H{
					"clusterName": c.Param("cluster"),
					"events":      []interface{}{},
					"count":       0,
				})
			})
		}
	}

	// Plugin endpoint calls - allows frontend to call plugin endpoints directly
	pluginEndpoints := router.Group("/api/plugin-endpoints")
	{
		pluginEndpoints.Any("/:pluginId/*endpoint", api.CallPluginEndpointHandler)
	}
}
