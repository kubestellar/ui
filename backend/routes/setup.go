package routes

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/telemetry"
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
	setupPluginRoutes(router)
}
