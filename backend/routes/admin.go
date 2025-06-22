package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/middleware"
)

// set up admin routes
func setupAdminRoutes(router *gin.Engine) {
	admin := router.Group("/api/admin")
	admin.Use(middleware.AuthenticateMiddleware(), middleware.RequireAdmin())

	admin.GET("/users", ListUsersHandler)
	admin.POST("/users", CreateUserHandler)
	admin.PUT("/users/:username", UpdateUserHandler)
	admin.DELETE("/users/:username", DeleteUserHandler)
}
