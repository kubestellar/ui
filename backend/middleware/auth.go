package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	jwtconfig "github.com/katamyra/kubestellarUI/jwt"
)

// Middleware to verify JWT token and extract username
func AuthenticateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")

		// Parse token
		claims := jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtconfig.GetJWTSecret()), nil
		})

		// Token verification failed
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Extract username
		username, exists := claims["username"].(string)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
			c.Abort()
			return
		}

		// Store username in context
		c.Set("username", username)

		// Proceed to next handler
		c.Next()
	}
}
