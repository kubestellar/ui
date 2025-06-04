package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
)

// SetupAllRoutes initializes all application routes
func SetupAllRoutes(router *gin.Engine) {
	// Setup core API routes
	setupResourceRoutes(router)

	// Setup authentication routes
	setupAuthRoutes(router)

	// Setup installation and deployment routes
	setupInstallerRoutes(router)
	setupDeploymentRoutes(router)

	// Setup cluster and namespace management
	setupClusterRoutes(router)
	setupBindingPolicyRoutes(router)
	setupNamespaceRoutes(router)

	// Setup GitOps related routes
	setupHealthRoutes(router)
	setupGitopsRoutes(router)
	setupHelmRoutes(router)
	setupGitHubRoutes(router)
	setupDeploymentHistoryRoutes(router)
	setupWebhookRoutes(router)
	setupValidationRoutes(router)

	// Setup artifact hub and other integration routes
	setupArtifactHubRoutes(router)
	setupMetricsRoutes(router)

	// Setup WebSocket and streaming routes
	getWecsResources(router)

	// Setup WDS cookies routes
	setupWdsCookiesRoute(router)

	// Setup backup routes
	SetupBackupRoutes(router)

	// Setup plugin routes
	plugins.Pm.SetupPluginsRoutes(router)
}
