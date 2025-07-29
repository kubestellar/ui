package routes

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/middleware"
	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/kubestellar/ui/backend/wds"
	"github.com/prometheus/client_golang/prometheus"
)

func init() {
	fmt.Println("Registering Prometheus metrics..(((((((((((((((((((((((()))))))))))))))))))))))).")
	prometheus.MustRegister(telemetry.TotalHTTPRequests)
	prometheus.MustRegister(telemetry.HTTPRequestDuration)
	prometheus.MustRegister(telemetry.HTTPErrorCounter)
	prometheus.MustRegister(telemetry.BindingPolicyCacheHits)
	prometheus.MustRegister(telemetry.BindingPolicyCacheMisses)
	prometheus.MustRegister(telemetry.BindingPolicyWatchEvents)
	prometheus.MustRegister(telemetry.BindingPolicyReconciliationDuration)
	prometheus.MustRegister(telemetry.BindingPolicyOperationsTotal)
	prometheus.MustRegister(telemetry.WebsocketConnectionsActive)
	prometheus.MustRegister(telemetry.WebsocketConnectionsFailed)
	prometheus.MustRegister(telemetry.KubectlOperationsTotal)
	prometheus.MustRegister(telemetry.ClusterOnboardingDuration)
	prometheus.MustRegister(telemetry.GithubDeploymentsTotal)
	prometheus.MustRegister(telemetry.WebsocketConnectionUpgradedSuccess)
	prometheus.MustRegister(telemetry.WebsocketConnectionUpgradedFailed)
}

func SetupRoutes(router *gin.Engine) {
	// Apply global authentication middleware to all API routes
	apiGroup := router.Group("/api")
	apiGroup.Use(middleware.AuthenticateMiddleware())

	// Apply authentication to cluster routes (non-/api routes)
	clusterGroup := router.Group("/clusters")
	clusterGroup.Use(middleware.AuthenticateMiddleware())

	// Apply authentication to WebSocket routes
	wsGroup := router.Group("/ws")
	wsGroup.Use(middleware.AuthenticateMiddleware())

	// Apply authentication to deployment routes
	deployGroup := router.Group("/deploy")
	deployGroup.Use(middleware.AuthenticateMiddleware())

	// Initialize all route groups with authentication
	setupClusterRoutes(router, apiGroup, clusterGroup, wsGroup)
	setupDeploymentRoutes(router, apiGroup, wsGroup)
	setupNamespaceRoutes(router, apiGroup, wsGroup)
	setupBindingPolicyRoutes(router, apiGroup)
	setupResourceRoutes(router, apiGroup)
	getWecsResources(router, apiGroup, wsGroup)
	setupInstallerRoutes(router, apiGroup, wsGroup)
	setupWdsCookiesRoute(router, apiGroup)
	setupGitopsRoutes(router, apiGroup, deployGroup)
	setupHelmRoutes(router, deployGroup)
	setupGitHubRoutes(router, apiGroup)
	setupDeploymentHistoryRoutes(router, apiGroup)
	setupAuthRoutes(router)
	setupArtifactHubRoutes(router, apiGroup)
	setupPluginRoutes(router, apiGroup)
	setupMetricsRoutes(router, apiGroup)

	// Metrics endpoint with authentication
	apiGroup.GET("/v1/metrics", func(c *gin.Context) {
		api.GetMetrics(c)
	})

	// Public endpoint for WDS context
	router.GET("/wds/get/context", wds.GetWdsContextCookies)
	router.POST("/wds/set/context", wds.SetWdsContextCookies)
}
