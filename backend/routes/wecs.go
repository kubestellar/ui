package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/wecs"
)

func getWecsResources(router *gin.Engine) {
	router.GET("/ws/wecs", wecs.StreamK8sData)
	router.GET("/ws/logs", wecs.StreamPodLogs)
}
