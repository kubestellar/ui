package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds/resources"
)

func setupServiceRoutes(router *gin.Engine) {
	router.GET("/api/services/:namespace", resources.GetServiceList)
	router.GET("/api/services/:namespace/:name", resources.GetServiceByServiceName)
	router.POST("/api/services/create", resources.CreateService)
	router.DELETE("/api/services/delete", resources.DeleteService)
}
