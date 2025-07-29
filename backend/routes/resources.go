package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/k8s"
	"github.com/kubestellar/ui/backend/wds"
)

// SetupRoutes initializes all API routes
func setupResourceRoutes(router *gin.Engine, apiGroup *gin.RouterGroup) {
	// TODO: make it to support the custom API Resource
	// TODO: make it to support the core API Resource in namespace / without namespace (wide-cluster resource)
	// TODO: add logic to check - is this is core API ? or not and based on this make request on it
	{
		apiGroup.GET("/wds/context", func(ctx *gin.Context) {
			wds.CreateWDSContextUsingCommand(ctx.Writer, ctx.Request, ctx)
		})
		apiGroup.GET("/wds/list-sse", wds.ListAllResourcesDetailsSSE)
		apiGroup.GET("/wds/list/:namespace", wds.ListAllResourcesByNamespace)
		apiGroup.GET("/:resourceKind/:namespace/log", k8s.LogWorkloads)
		apiGroup.POST("/resources", k8s.CreateResource)                        // Create a new resource
		apiGroup.POST("/resource/upload", k8s.UploadYAMLFile)                  // Upload any k8s resource file with "wds" key
		apiGroup.GET("/:resourceKind/:namespace", k8s.ListResources)           // List all resources
		apiGroup.GET("/:resourceKind/:namespace/:name", k8s.GetResource)       // Get a resource
		apiGroup.PUT("/:resourceKind/:namespace/:name", k8s.UpdateResource)    // Update a resource
		apiGroup.DELETE("/:resourceKind/:namespace/:name", k8s.DeleteResource) // Delete a resource

		// Add new endpoints for resource filtering
		apiGroup.GET("/resources/kinds", k8s.GetResourceKinds)   // Get all available resource kinds
		apiGroup.GET("/resources/namespaces", k8s.GetNamespaces) // Get all available namespaces
	}
}
