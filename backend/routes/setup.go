package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
)

func SetupRoutes(router *gin.Engine) {
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
	setupPluginRoutes(router) // API endpoints for plugin dashboard
	plugins.Pm.SetupPluginsRoutes(router) // Plugin-specific endpoints

	setupAuthRoutes(router)
	setupArtifactHubRoutes(router)
}
