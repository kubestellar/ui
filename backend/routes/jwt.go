package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/middleware"
	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/utils"
)

// SetupRoutes initializes all routes
func SetupAuthRoutes(router *gin.Engine) {
	router.POST("/login", LoginHandler)
	protected := router.Group("/protected").Use(middleware.AuthenticateMiddleware())
	{
		protected.GET("", ProtectedHandler)
	}
}

// Login handler
func LoginHandler(c *gin.Context) {
	var loginData models.User
	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := models.AuthenticateUser(loginData.Username, loginData.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(user.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// // Protected route
// func ProtectedHandler(c *gin.Context) {
// 	username, _ := c.Get("username")
// 	c.JSON(http.StatusOK, gin.H{"message": "Welcome to the protected route!", "user": username})
// }

// Protected Route
func ProtectedHandler(c *gin.Context) {
	// Get username from context
	username, exists := c.Get("username")
	if !exists {
		username = "Unknown User"
	}

	// Send response with username
	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the protected route!",
		"user":    username,
	})
}
