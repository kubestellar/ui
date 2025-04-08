package routes

import (
	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	// Initialize all route groups
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupNamespaceRoutes(router)
	setupAuthRoutes(router)
	setupBindingPolicyRoutes(router)
	setupResourceRoutes(router)
	getWecsResources(router)
	helmDeploy(router)
	GetDeploymentHistory(router)
	setupInstallerRoutes(router)
	setupWdsCookiesRoute(router)
}
