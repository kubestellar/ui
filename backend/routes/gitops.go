package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/k8s"
)

// setupGitopsRoutes registers general GitOps deployment routes
func setupGitopsRoutes(router *gin.Engine) {
	router.POST("api/deploy", api.DeployHandler)
}

// setupHelmRoutes registers all Helm chart related routes
func setupHelmRoutes(router *gin.Engine) {
	// Route for deploying Helm charts
	router.POST("/deploy/helm", k8s.HelmDeployHandler)

	// Routes for retrieving Helm deployments
	router.GET("/api/deployments/helm/list", k8s.ListHelmDeploymentsHandler)
	router.GET("/api/deployments/helm/:id", k8s.GetHelmDeploymentHandler)
	router.GET("/api/deployments/helm/namespace/:namespace", k8s.ListHelmDeploymentsByNamespaceHandler)
	router.GET("/api/deployments/helm/release/:release", k8s.ListHelmDeploymentsByReleaseHandler)

	// Route for deleting Helm deployments
	router.DELETE("/api/deployments/helm/:id", k8s.DeleteHelmDeploymentHandler)
}

// setupGitHubRoutes registers all GitHub related routes
func setupGitHubRoutes(router *gin.Engine) {
	// Route for listing GitHub deployments
	router.GET("/api/deployments/github/list", k8s.ListGithubDeployments)

	// Route for deleting GitHub deployments
	router.DELETE("/api/deployments/github/:id", k8s.DeleteGitHubDeploymentHandler)
}

// setupDeploymentHistoryRoutes registers routes for deployment history
func setupDeploymentHistoryRoutes(router *gin.Engine) {
	// GitHub config routes - for viewing stored deployment data
	router.GET("/api/deployments/github", func(c *gin.Context) {
		config, err := k8s.GetConfigMapData("its1", k8s.GitHubConfigMapName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get GitHub deployment data: %v", err)})
			return
		}
		c.JSON(http.StatusOK, config)
	})

	// Helm config routes - for viewing stored deployment data
	router.GET("/api/deployments/helm", func(c *gin.Context) {
		config, err := k8s.GetConfigMapData("its1", k8s.HelmConfigMapName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get Helm deployment data: %v", err)})
			return
		}
		c.JSON(http.StatusOK, config)
	})

	// Manifests config routes - for viewing stored deployment data
	router.GET("/api/deployments/manifests", func(c *gin.Context) {
		config, err := k8s.GetConfigMapData("its1", "kubestellar-manifests")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get manifests deployment data: %v", err)})
			return
		}
		c.JSON(http.StatusOK, config)
	})
}
