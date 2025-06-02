package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin_management"
)

// SetupRoutes initializes all API routes
func setupPluginManagement(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.GET("/plugin-management/listAllPlugins", plugin_management.ListAllInstalledPluginsHandler)
		api.POST("/plugin-management/addPlugin", plugin_management.AddPluginToListHandler)
		api.GET("/plugin-management/getPluginDetails", plugin_management.GetPluginManifestHandler)
		api.GET("/plugin-management/getPluginID", plugin_management.GetPluginID)
		api.GET("/plugin-management/InitializePlugin", plugin_management.InitializeHandlers)
		// api.GET("/plugin-management/AdditionOfPluginToList", func(c *gin.Context) {
		// 	plugins, err := plugin_management.AdditionOfPluginToListHandler(c)
		// 	if err != nil {
		// 		c.JSON(500, gin.H{"error": err.Error()})
		// 		return
		// 	}
		// 	c.JSON(200, plugins)
		// })
	}
}
