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
		// upload plugin to storage
		marketplace.POST("/plugins/upload", api.UploadPluginHandler)

		// download plugin from git storage
		marketplace.GET("/plugins/download/:id", api.InstallMarketplacePluginHandler)

		// delete a marketplace plugin
		marketplace.DELETE("/plugins/:id", api.DeleteMarketplacePluginHandler)

		// get all marketplace plugins
		marketplace.GET("/plugins", api.GetAllMarketplacePluginsHandler)

		// get a marketplace plugin by ID
		marketplace.GET("/plugins/:id", api.GetSingleMarketplacePluginHandler)

		// get reviews/feedback for a marketplace plugin
		marketplace.GET("/plugins/:id/reviews", api.GetMarketplacePluginReviewsHandler)

		// submit a review/feedback for a marketplace plugin
		marketplace.POST("/plugins/:id/reviews", api.SubmitMarketplacePluginFeedbackHandler)

		// get marketplace plugin categories
		marketplace.GET("/plugins/categories", api.GetMarketplacePluginCategoriesHandler)

		// get featured marketplace plugins
		marketplace.GET("/plugins/featured", api.GetMarketplaceFeaturedPluginsHandler)

		// get marketplace plugin dependencies
		marketplace.GET("/plugins/:id/dependencies", api.GetMarketplacePluginDependenciesHandler)

		// search marketplace plugins
		marketplace.GET("/plugins/search", api.SearchMarketplacePluginsHandler)
	}
}
