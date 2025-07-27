package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
)



func SetupRoutes(router *gin.Engine) {
	RegisterMetrics()
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
	setupPluginRoutes(router)
	setupMetricsRoutes(router)
	router.GET("/api/v1/metrics", func(c *gin.Context) {
		api.GetMetrics(c)
	})
}
