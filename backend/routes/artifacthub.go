package routes

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

func setupArtifactHubRoutes(router *gin.Engine) {
	// Artifact Hub routes - clearly identify all endpoints as Artifact Hub operations
	artifactHub := router.Group("/api/v1/artifact-hub")
	{
		// Deploy a Helm chart from Artifact Hub
		artifactHub.POST("/helm-deploy", api.DeployFromArtifactHub)

		// Search for packages in Artifact Hub
		artifactHub.POST("/packages/search", api.SearchArtifactHub)

		// List all available repositories in Artifact Hub
		artifactHub.GET("/repositories/list", api.ListArtifactHubRepositories)

		// Advanced search for packages with comprehensive details
		artifactHub.POST("/packages/advanced-search", api.SearchArtifactHubAdvance)

		// Get advanced package details with all metadata
		// Use wildcards for routes that need package IDs with slashes
		// This handles /details, /default-values and /advanced-details endpoints
		artifactHub.GET("/packages/*packageId", func(c *gin.Context) {
			path := c.Param("packageId")
			path = strings.TrimPrefix(path, "/")

			// Check which endpoint is being requested
			if strings.HasSuffix(path, "/advanced-details") {
				// Remove the "/advanced-details" suffix
				packageID := strings.TrimSuffix(path, "/advanced-details")
				c.Params = []gin.Param{{Key: "packageId", Value: packageID}}
				api.GetArtifactHubPackageAdvanceDetails(c)
			} else if strings.HasSuffix(path, "/details") {
				// Remove the "/details" suffix
				packageID := strings.TrimSuffix(path, "/details")
				c.Params = []gin.Param{{Key: "packageId", Value: packageID}}
				api.GetArtifactHubPackageInfo(c)
			} else if strings.HasSuffix(path, "/default-values") {
				// Remove the "/default-values" suffix
				packageID := strings.TrimSuffix(path, "/default-values")
				c.Params = []gin.Param{{Key: "packageId", Value: packageID}}
				api.GetArtifactHubPackageValues(c)
			} else {
				c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
			}
		})

	}
}
