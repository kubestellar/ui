package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/plugin/plugins"
)
func SetupRoutes(router *gin.Engine) {
	// API routes group
	apiGroup := router.Group("/api")
	{
		// Plugin routes
		apiGroup.GET("/plugins", api.GetPlugins)
		apiGroup.GET("/plugins/:name/stats", api.GetPluginStats)
	}

	// Initialize all route groups
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupNamespaceRoutes(router)
	setupBindingPolicyRoutes(router)
	setupResourceRoutes(router)
	getWecsResources(router)
	setupInstallerRoutes(router)
	setupWdsCookiesRoute(router)
	setupGitopsRoutes(router)
	setupHelmRoutes(router)
	setupGitHubRoutes(router)
	setupDeploymentHistoryRoutes(router)
	setupAuthRoutes(router)
	setupArtifactHubRoutes(router)

	plugins.Pm.SetupPluginsRoutes(router)
}
