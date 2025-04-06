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
	// Cluster onboarding and status endpoints.
	router.POST("/clusters/onboard", api.OnboardClusterHandler)
	router.GET("/clusters/status", api.GetClusterStatusHandler)

	// API for generating command.
	router.POST("/clusters/manual/generateCommand", handlers.GenerateCommandHandler)

	// Watch CSR endpoint.
	router.GET("/clusters/watch-csr", handlers.GetCSRsExecHandler)

	// Get available clusters endpoint.
	router.GET("/api/clusters/available", handlers.GetAvailableClustersHandler)

	// New PATCH endpoint for updating managed cluster labels in ITS.
	router.PATCH("/api/managedclusters/labels", api.UpdateManagedClusterLabelsHandler)
}
