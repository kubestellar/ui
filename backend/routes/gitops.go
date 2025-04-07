package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/k8s"
)

func setupGitopsRoutes(router *gin.Engine) {
	router.POST("api/deploy", api.DeployHandler)
}

func helmDeploy(router *gin.Engine) {
	// Route for deploying Helm charts
	router.POST("/deploy/helm", k8s.HelmDeployHandler)

	// Routes for listing and retrieving Helm deployments

	// List all Helm deployments
	router.GET("/api/deployments/helm/list", k8s.ListHelmDeploymentsHandler)

	// List all Helm deployments for a specific namespace
	router.GET("/api/deployments/github/list", k8s.ListGithubDeployments)

	// Get a specific Helm deployment by ID
	router.GET("/api/deployments/helm/:id", k8s.GetHelmDeploymentHandler)

	// List all Helm deployments for a specific namespace
	router.GET("/api/deployments/helm/namespace/:namespace", k8s.ListHelmDeploymentsByNamespaceHandler)

	// List all Helm deployments for a specific release
	router.GET("/api/deployments/helm/release/:release", k8s.ListHelmDeploymentsByReleaseHandler)
}

func GetDeploymentHistory(router *gin.Engine) {

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
