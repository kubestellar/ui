package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/middleware"
)

func setupMarketplaceRoutes(router *gin.Engine) {
	marketplace := router.Group("/api/marketplace")
	marketplace.Use(middleware.AuthenticateMiddleware())
	{
		// Plugin management
		marketplace.POST("/plugins/upload", api.UploadPluginHandler)
		marketplace.DELETE("/plugins/:id", api.DeleteMarketplacePluginHandler)
		marketplace.GET("/plugins", api.GetAllMarketplacePluginsHandler)
		marketplace.GET("/plugins/:id", api.GetSingleMarketplacePluginHandler)
		marketplace.GET("/plugins/:id/reviews", api.GetMarketplacePluginReviewsHandler)
		marketplace.POST("/plugins/:id/reviews", api.SubmitMarketplacePluginFeedbackHandler)
	}
}
