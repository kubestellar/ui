package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/its/manual/handlers"
)

func setupClusterRoutes(router *gin.Engine) {
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

	// Cluster onboarding, status, and detachment
	router.POST("/clusters/onboard", api.OnboardClusterHandler)
	router.GET("/clusters/status", api.GetClusterStatusHandler)
	router.POST("/clusters/detach", api.DetachClusterHandler)

	// Logs and WebSocket
	router.GET("/clusters/onboard/logs/:cluster", api.OnboardingLogsHandler)
	router.GET("/clusters/detach/logs/:cluster", api.GetDetachmentLogsHandler)
	router.GET("/ws/onboarding", api.WSOnboardingHandler)

	// Certificate Signing Requests
	router.GET("/clusters/watch-csr", handlers.GetCSRsExecHandler)

	// Available clusters
	router.GET("/api/clusters/available", handlers.GetAvailableClustersHandler)

	// Managed cluster label update
	router.PATCH("/api/managedclusters/labels", api.UpdateManagedClusterLabelsHandler)

	router.GET("/ws/detachment", api.HandleDetachmentWebSocket)

	// Import cluster
	router.POST("/clusters/import", handlers.ImportClusterHandler)

	// Remote Tree View Cluster details
	router.GET("/api/cluster/details/:name", handlers.GetClusterDetailsHandler)

	router.GET("api/new/clusters", api.GetManagedClustersHandler)
	router.GET("api/clusters/:name", api.GetManagedClusterHandler)
}
