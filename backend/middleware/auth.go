package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kubestellar/ui/auth"
	jwtconfig "github.com/kubestellar/ui/jwt"
)

// AuthenticateMiddleware validates JWT token
func AuthenticateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			c.Abort()
			return
		}

		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		claims := jwt.MapClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtconfig.GetJWTSecret()), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		username, exists := claims["username"].(string)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
			c.Abort()
			return
		}

		// Get user permissions from auth system
		userConfig, exists, err := auth.GetUserByUsername(username)
		if err != nil || !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Store both username and permissions in context
		c.Set("username", username)
		c.Set("permissions", userConfig.Permissions)
		c.Next()
	}
}

// RequirePermission middleware checks if the user has a specific permission
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permissionsInterface, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		permissions, ok := permissionsInterface.([]string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid permission format"})
			c.Abort()
			return
		}

		hasPermission := false
		for _, p := range permissions {
			if p == permission {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin middleware checks if the user has admin permissions
func RequireAdmin() gin.HandlerFunc {
	return RequirePermission("admin")
}
