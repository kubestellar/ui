package routes

import (
	"github.com/gin-gonic/gin"
	nsresources "github.com/kubestellar/ui/namespace/resources"
)

func setupNamespaceRoutes(router *gin.Engine) {
	router.GET("/api/namespaces", nsresources.GetAllNamespaces)
	router.GET("/api/namespaces/:name", nsresources.GetNamespaceDetails)
	router.POST("/api/namespaces/create", nsresources.CreateNamespace)
	router.PUT("/api/namespaces/update/:name", nsresources.UpdateNamespace)
	router.DELETE("/api/namespaces/delete/:name", nsresources.DeleteNamespace)
	router.GET("/ws/namespaces", nsresources.NamespaceWebSocketHandler)
}
