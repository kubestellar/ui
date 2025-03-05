package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/k8s"
)

// SetupRoutes initializes all API routes
func SetupResourceRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.POST("/:resourceType/:namespace", k8s.CreateResource)              // Create a new resource
		api.GET("/:resourceType/:namespace/:name", k8s.GetResource)            // Get a resource
		api.GET("/:resourceType/:namespace/:name/yaml", k8s.GetResourceAsYAML) // Get resource as YAML
		api.PUT("/:resourceType/:namespace/:name", k8s.UpdateResource)         // Update a resource
		api.DELETE("/:resourceType/:namespace/:name", k8s.DeleteResource)      // Delete a resource
	}
}
