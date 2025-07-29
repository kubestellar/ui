package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/its/manual/handlers"
)

func setupClusterRoutes(router *gin.Engine, apiGroup *gin.RouterGroup, clusterGroup *gin.RouterGroup, wsGroup *gin.RouterGroup) {
	// Public route for basic cluster info (needed for initial frontend setup)
	router.GET("/api/clusters", func(c *gin.Context) {
		contexts, clusters, currentContext, err, itsData := handlers.GetKubeInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"contexts":       contexts,
			"clusters":       clusters,
			"currentContext": currentContext,
			"itsData":        itsData,
		})
	})

	// Protected cluster operations
	clusterGroup.POST("/onboard", api.OnboardClusterHandler)
	clusterGroup.GET("/status", api.GetClusterStatusHandler)
	clusterGroup.POST("/detach", api.DetachClusterHandler)

	// Protected logs and WebSocket
	clusterGroup.GET("/onboard/logs/:cluster", api.OnboardingLogsHandler)
	clusterGroup.GET("/detach/logs/:cluster", api.GetDetachmentLogsHandler)
	wsGroup.GET("/onboarding", api.WSOnboardingHandler)

	// Protected Certificate Signing Requests
	clusterGroup.GET("/watch-csr", handlers.GetCSRsExecHandler)

	// Protected available clusters
	apiGroup.GET("/clusters/available", handlers.GetAvailableClustersHandler)

	// Protected managed cluster label update
	apiGroup.PATCH("/managedclusters/labels", api.UpdateManagedClusterLabelsHandler)

	wsGroup.GET("/detachment", api.HandleDetachmentWebSocket)

	// Protected import cluster
	clusterGroup.POST("/import", handlers.ImportClusterHandler)

	// Protected Remote Tree View Cluster details
	apiGroup.GET("/cluster/details/:name", handlers.GetClusterDetailsHandler)

	apiGroup.GET("/new/clusters", api.GetManagedClustersHandler)
	apiGroup.GET("/clusters/:name", api.GetManagedClusterHandler)
}
