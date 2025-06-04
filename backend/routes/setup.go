package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
)

// SetupAllRoutes initializes all application routes
func SetupAllRoutes(router *gin.Engine) {
	// Setup authentication routes
	setupAuthRoutes(router)

	// Setup API routes
	setupInstallerRoutes(router)
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupBindingPolicyRoutes(router)
	setupNamespaceRoutes(router)
	setupArtifactHubRoutes(router)

	// Setup WebSocket and streaming routes
	getWecsResources(router)

	// Setup plugin routes
	plugins.Pm.SetupPluginsRoutes(router)
}
