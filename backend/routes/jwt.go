package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/middleware"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/utils"
)

// SetupAuthRoutes initializes authentication routes
func SetupAuthRoutes(router *gin.Engine) {
	router.POST("/login", LoginHandler)
	protected := router.Group("/protected").Use(middleware.AuthenticateMiddleware())
	{
		protected.GET("", ProtectedHandler)
	}
}

// LoginHandler verifies user credentials and issues JWT
func LoginHandler(c *gin.Context) {
	var loginData struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := models.AuthenticateUser(loginData.Username, loginData.Password)
	if user == nil || err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(loginData.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generating token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// ProtectedHandler validates JWT and returns user info
func ProtectedHandler(c *gin.Context) {
	username, exists := c.Get("username")
	if !exists {
		username = "Unknown User"
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Welcome to the protected route!",
		"user":    username,
	})
}
