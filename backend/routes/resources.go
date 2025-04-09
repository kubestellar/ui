package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/wds"
)

// SetupRoutes initializes all API routes
func setupResourceRoutes(router *gin.Engine) {
	// TODO: make it to support the custom API Resource
	// TODO: make it to support the core API Resource in namespace / without namespace (wide-cluster resource)
	// TODO: add logic to check - is this is core API ? or not and based on this make request on it
	api := router.Group("/api")
	{

		api.GET("/wds/context", func(ctx *gin.Context) {
			wds.CreateWDSContextUsingCommand(ctx.Writer, ctx.Request, ctx)
		})
		api.GET("/wds/list", wds.ListAllResourcesDetails)
		api.GET("/wds/list/:namespace", wds.ListAllResourcesByNamespace)
		api.GET("/:resourceKind/:namespace/log", k8s.LogWorkloads)
		api.POST("/resources", k8s.CreateResource)                        // Create a new resource
		api.POST("/resource/upload", k8s.UploadYAMLFile)                  // Upload any k8s resource file with "wds" key
		api.GET("/:resourceKind/:namespace", k8s.ListResources)           // List all resources
		api.GET("/:resourceKind/:namespace/:name", k8s.GetResource)       // Get a resource
		api.PUT("/:resourceKind/:namespace/:name", k8s.UpdateResource)    // Update a resource
		api.DELETE("/:resourceKind/:namespace/:name", k8s.DeleteResource) // Delete a resource
	}
}
