package routes

import (
	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	// Initialize all route groups
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupNamespaceRoutes(router)
	SetupAuthRoutes(router)
	setupBindingPolicyRoutes(router)
	SetupResourceRoutes(router)
	getWecsResources(router)
	helmDeploy(router)
}
