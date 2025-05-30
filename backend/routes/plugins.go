package routes

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

// SetupPluginRoutes sets up the plugin management API endpoints
func SetupPluginRoutes(router *gin.Engine) {
	// Core plugin management routes
	pluginGroup := router.Group("/api/plugins")
	{
		pluginGroup.POST("/load", api.LoadPluginFromGitHubHandler)
		pluginGroup.GET("", api.ListPluginsHandler)
		pluginGroup.GET("/discover", api.DiscoverPluginsHandler)
		pluginGroup.GET("/:id", api.GetPluginHandler)
		pluginGroup.DELETE("/:id", api.UnloadPluginHandler)
		pluginGroup.GET("/:id/health", api.GetPluginHealthHandler)
	}

	// Local Plugin Testing Routes
	localGroup := router.Group("/api/plugins/local")
	{
		localGroup.POST("/load", api.LoadLocalPluginHandler)
		localGroup.POST("/unload", api.UnloadLocalPluginHandler)
		localGroup.GET("/list", api.ListLocalPluginsHandler)
		localGroup.GET("/build", api.BuildLocalPluginHandler)
	}

	// GitHub Repository Plugin Routes
	githubGroup := router.Group("/api/plugins/github")
	{
		githubGroup.POST("/install", api.InstallGitHubRepositoryHandler)
		githubGroup.POST("/update", api.UpdateGitHubRepositoryHandler)
	}

	// Plugin endpoint proxy
	pluginEndpointGroup := router.Group("/api/plugin-endpoints")
	{
		pluginEndpointGroup.Any("/:pluginId/*endpoint", api.CallPluginEndpointHandler)
	}

	log.Println("Plugin management routes registered:")
	log.Println("  POST   /api/plugins/load                    - Load plugin from GitHub")
	log.Println("  GET    /api/plugins                         - List all loaded plugins")
	log.Println("  GET    /api/plugins/:id                     - Get plugin details")
	log.Println("  DELETE /api/plugins/:id                     - Unload plugin")
	log.Println("  GET    /api/plugins/:id/health              - Check plugin health")
	log.Println("  GET    /api/plugins/discover                - Discover available plugins")
	log.Println("  ANY    /api/plugin-endpoints/:pluginId/*   - Call plugin endpoints")

	log.Println("\nLocal Plugin Testing routes:")
	log.Println("  POST   /api/plugins/local/load              - Load local plugin file")
	log.Println("  POST   /api/plugins/local/unload            - Unload local plugin")
	log.Println("  GET    /api/plugins/local/list              - List local plugins")
	log.Println("  GET    /api/plugins/local/build             - Get build information")

	log.Println("\nGitHub Repository routes:")
	log.Println("  POST   /api/plugins/github/install          - Install from GitHub repo")
	log.Println("  POST   /api/plugins/github/update           - Update GitHub repo plugin")
}
