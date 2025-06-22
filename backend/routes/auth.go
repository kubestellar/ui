package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/auth"
	"github.com/kubestellar/ui/middleware"
)

// set up authentication routes
func setupAuthRoutes(router *gin.Engine) {
	// Authentication routes
	router.POST("/login", auth.LoginHandler)

	// API group for all endpoints
	api := router.Group("/api")

	// Protected API endpoints requiring authentication
	protected := api.Group("/")
	protected.Use(middleware.AuthenticateMiddleware())
	{
		protected.GET("/me", CurrentUserHandler)
	}
}
