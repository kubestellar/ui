package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	ns "github.com/kubestellar/ui/backend/namespace"
	nsresources "github.com/kubestellar/ui/backend/namespace/resources"
)

func setupNamespaceRoutes(router *gin.Engine, apiGroup *gin.RouterGroup, wsGroup *gin.RouterGroup) {
	apiGroup.GET("/namespaces", nsresources.GetAllNamespaces)
	apiGroup.GET("/namespaces/:name", nsresources.GetNamespaceDetails)
	apiGroup.POST("/namespaces/create", nsresources.CreateNamespace)
	apiGroup.PUT("/namespaces/update/:name", nsresources.UpdateNamespace)
	apiGroup.DELETE("/namespaces/delete/:name", nsresources.DeleteNamespace)
	wsGroup.GET("/namespaces", nsresources.NamespaceWebSocketHandler)
	apiGroup.GET("/all-contexts/namespaces", func(c *gin.Context) {
		ns.GetAllContextsNamespaces(c.Writer, c.Request)
	})

	// WebSocket endpoints
	wsGroup.GET("/all-contexts", func(c *gin.Context) {
		ns.WatchAllContextsNamespaces(c.Writer, c.Request)
	})

	// Context-specific watch endpoint
	wsGroup.GET("/context-namespace", func(c *gin.Context) {
		ns.WatchNamespaceInContext(c.Writer, c.Request)
	})

	apiGroup.GET("/compare-namespace/:name", func(c *gin.Context) {
		// Extract the namespace name from URL parameters
		namespaceName := c.Param("name")

		// Create a new request with the correct path
		req, _ := http.NewRequest("GET", fmt.Sprintf("/api/compare-namespace/%s", namespaceName), nil)

		// Copy query parameters from the original request
		req.URL.RawQuery = c.Request.URL.RawQuery

		// Add the original context to the request
		req = req.WithContext(c.Request.Context())

		// Debug output
		fmt.Printf("Original path: %s\n", c.Request.URL.Path)
		fmt.Printf("New request path: %s\n", req.URL.Path)
		fmt.Printf("Query params: %s\n", req.URL.RawQuery)

		// Create a response recorder to capture the response
		w := c.Writer

		// Call our comparison function
		ns.GetMultiContextNamespaceComparison(w, req)
	})

	// Namespace synchronization endpoint
	apiGroup.POST("/sync-namespace/:name", func(c *gin.Context) {
		// Extract the namespace name from URL parameters
		namespaceName := c.Param("name")

		// Create a new request with the correct path for our handler
		req, _ := http.NewRequest("POST", "/api/sync-namespace/"+namespaceName, c.Request.Body)

		// Call our synchronization function
		ns.SynchronizeNamespace(c.Writer, req)
	})
}
