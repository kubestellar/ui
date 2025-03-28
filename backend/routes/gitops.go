package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/kubestellar/ui/k8s"
)

func setupGitopsRoutes(router *gin.Engine) {
	router.POST("api/deploy", api.DeployHandler)
}

func helmDeploy(router *gin.Engine) {
	router.POST("/deploy/helm", k8s.HelmDeployHandler)
}
