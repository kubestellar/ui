package routes

import (
	"github.com/gin-gonic/gin"
	// "github.com/kubestellar/ui/plugin_management"
	// "github.com/kubestellar/ui/plugin/plugins"
)

func SetupRoutes(router *gin.Engine) {
	// Initialize all route groups
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupNamespaceRoutes(router)
	RegisterPluginAPI(router)
	// registerGhodaaRoute(router)
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
	setupPluginManagement(router)
}

