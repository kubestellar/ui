package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/wecs"
)

func getWecsResources(router *gin.Engine, apiGroup *gin.RouterGroup, wsGroup *gin.RouterGroup) {
	wsGroup.GET("/wecs", wecs.StreamK8sDataChronologically)
	wsGroup.GET("/logs", wecs.StreamPodLogs)
	wsGroup.GET("/pod/:namespace/:pod/shell/:container", wecs.HandlePodExecShell)
	apiGroup.GET("/list/container/:namespace/:pod", wecs.GetAllPodContainersName)
}
