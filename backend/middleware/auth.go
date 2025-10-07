package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/utils"
)

// AuthenticateMiddleware validates JWT token
func AuthenticateMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Set("is_admin", claims.IsAdmin)
		c.Set("permissions", claims.Permissions)
		c.Set("user_id", claims.UserID)
		c.Next()
	}
}

// RequireAdmin ensures user has admin privileges
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("is_admin")
		if !exists || !isAdmin.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// RequirePermission checks if user has specific permission for a component
func RequirePermission(component, requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permissions, exists := c.Get("permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "No permissions found"})
			c.Abort()
			return
		}

		userPermissions := permissions.(map[string]string)
		userPerm, hasComponent := userPermissions[component]

		if !hasComponent {
			c.JSON(http.StatusForbidden, gin.H{"error": "No permission for this component"})
			c.Abort()
			return
		}

		if !hasRequiredPermission(userPerm, requiredPermission) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// hasRequiredPermission checks if user permission satisfies requirement
func hasRequiredPermission(userPerm, required string) bool {
	switch required {
	case "read":
		return userPerm == "read" || userPerm == "write"
	case "write":
		return userPerm == "write"
	default:
		return false
	}
}
