package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/api"
	"github.com/katamyra/kubestellarUI/its/manual/handlers"
	"net/http"
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
	router.POST("/clusters/onboard", api.OnboardClusterHandler)
	router.GET("/clusters/status", api.GetClusterStatusHandler)
	router.POST("/clusters/import", api.ImportClusterHandler)

	// API for generating command
	router.POST("/clusters/manual/generateCommand", handlers.GenerateCommandHandler)

	// Endpoint to get available clusters from kubeconfig.
	router.GET("/api/clusters/available", handlers.GetAvailableClustersHandler)

}
