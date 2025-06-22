package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	jwtconfig "github.com/kubestellar/ui/jwt"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/postgresql"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AuthenticateMiddleware validates JWT token
func AuthenticateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			log.LogWarn("Authentication failed: missing token", zap.String("path", c.Request.URL.Path))
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
			log.LogWarn("Authentication failed: invalid token",
				zap.String("path", c.Request.URL.Path),
				zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		username, exists := claims["username"].(string)
		if !exists {
			log.LogWarn("Authentication failed: invalid token payload",
				zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
			c.Abort()
			return
		}

		// Get user permissions from auth system
		user, err := postgresql.GetUserByUsername(username)
		if err != nil {
			var msg string
			switch {
			case err == gorm.ErrRecordNotFound:
				msg = "user not found in database"
			default:
				msg = "error when execute query on database"
			}
			log.LogError(
				msg,
				zap.String("username", username),
				zap.String("error", err.Error()),
			)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			c.Abort()
			return
		}

		log.LogInfo(
			"User authenticated successfully",
			zap.String("username", username),
			zap.String("path", c.Request.URL.Path),
		)

		// Store both username and permissions in context
		c.Set("username", username)
		c.Set("permissions", user.Permissions)
		c.Next()
	}
}

// RequirePermission middleware checks if the user has a specific permission
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		username, _ := c.Get("username")
		permissionsInterface, exists := c.Get("permissions")
		if !exists {
			log.LogWarn("Permission check failed: no permissions found",
				zap.String("username", username.(string)),
				zap.String("permission", permission),
				zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusForbidden, gin.H{"error": "Authorization required"})
			c.Abort()
			return
		}

		permissions, ok := permissionsInterface.([]string)
		if !ok {
			log.LogError("Permission check failed: invalid permission format",
				zap.String("username", username.(string)),
				zap.String("path", c.Request.URL.Path))
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
			log.LogWarn("Permission check failed: insufficient permissions",
				zap.String("username", username.(string)),
				zap.String("required_permission", permission),
				zap.String("path", c.Request.URL.Path))
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		log.LogInfo("Permission check passed",
			zap.String("username", username.(string)),
			zap.String("permission", permission),
			zap.String("path", c.Request.URL.Path))
		c.Next()
	}
}

// RequireAdmin middleware checks if the user has admin permissions
func RequireAdmin() gin.HandlerFunc {
	return RequirePermission("admin")
}
