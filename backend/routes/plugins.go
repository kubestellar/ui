package routes

import (
    "log"

    "github.com/gin-gonic/gin"
    "github.com/kubestellar/ui/api"
)

// SetupPluginRoutes sets up the plugin management API endpoints
func SetupPluginRoutes(router *gin.Engine) {
    pluginGroup := router.Group("/api/plugins")
    {
        pluginGroup.POST("/load", api.LoadPluginFromGitHubHandler)
        pluginGroup.POST("/load-local", api.LoadPluginFromFileHandler)
        pluginGroup.GET("", api.ListPluginsHandler)
        pluginGroup.GET("/discover", api.DiscoverPluginsHandler)
        pluginGroup.GET("/:id", api.GetPluginHandler)
        pluginGroup.DELETE("/:id", api.UnloadPluginHandler)
        pluginGroup.GET("/:id/health", api.GetPluginHealthHandler)
    }

    pluginEndpointGroup := router.Group("/api/plugin-endpoints")
    {
        pluginEndpointGroup.Any("/:pluginId/*endpoint", api.CallPluginEndpointHandler)
    }

    log.Println("Plugin management routes registered:")
    log.Println("  POST   /api/plugins/load")
    log.Println("  POST   /api/plugins/load-local")
    log.Println("  GET    /api/plugins")
    log.Println("  GET    /api/plugins/:id")
    log.Println("  DELETE /api/plugins/:id")
    log.Println("  GET    /api/plugins/:id/health")
    log.Println("  GET    /api/plugins/discover")
    log.Println("  ANY    /api/plugin-endpoints/:pluginId/*endpoint")
}