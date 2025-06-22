package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/middleware"
)

// set up resource routes
func setupAuthResourcesRoutes(router *gin.Engine) {
	api := router.Group("/api")
	api.Use(middleware.AuthenticateMiddleware())

	read := api.Group("/")
	read.Use(middleware.RequirePermission("read"))
	read.GET("/resources", GetResourcesHandler)

	write := api.Group("/auth")
	write.Use(middleware.RequirePermission("write"))
	write.POST("/auth/resources", CreateResourceHandler)
	write.PUT("/auth/resources/:id", UpdateResourceHandler)
	write.DELETE("/auth/resources/:id", DeleteResourceHandler)
}
