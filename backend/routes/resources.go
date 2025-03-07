package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/k8s"
)

// SetupRoutes initializes all API routes
func SetupResourceRoutes(router *gin.Engine) {
	// TODO: make it to support the custom API Resource
	// TODO: make it to support the core API Resource in namespace / without namespace (wide-cluster resource)
	// TODO: add logic to check - is this is core API ? or not and based on this make request on it
	api := router.Group("/api")
	{
		api.POST("/:resourceType/:namespace", k8s.CreateResource)         // Create a new resource
		api.GET("/:resourceType/:namespace/:name", k8s.GetResource)       // Get a resource
		api.PUT("/:resourceType/:namespace/:name", k8s.UpdateResource)    // Update a resource
		api.DELETE("/:resourceType/:namespace/:name", k8s.DeleteResource) // Delete a resource
	}
}
