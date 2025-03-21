package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

func setupGitopsRoutes(router *gin.Engine) {
	router.POST("api/deploy", api.DeployHandler)
}
