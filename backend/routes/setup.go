package routes

import (
	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	// Initialize all route groups
	setupClusterRoutes(router)
	setupDeploymentRoutes(router)
	setupServiceRoutes(router)
	setupNamespaceRoutes(router)
	setupBlueprintRoutes(router)
}
