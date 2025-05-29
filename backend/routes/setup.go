package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
	"github.com/kubestellar/ui/services" 
)

func SetupRoutes(router *gin.Engine, pluginService *services.PluginService) {
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

	// Setup existing plugin routes
	plugins.Pm.SetupPluginsRoutes(router)

	// Setup new dynamic plugin management routes
	if pluginService != nil {
		SetupPluginRoutes(router)
	}

	setupAuthRoutes(router)
	setupArtifactHubRoutes(router)
	setupMetricsRoutes(router)
}
