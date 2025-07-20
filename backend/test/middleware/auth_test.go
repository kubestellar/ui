package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/middleware"
	"github.com/kubestellar/ui/backend/utils"
	"github.com/stretchr/testify/assert"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestAuthenticateMiddleware_ValidToken(t *testing.T) {
	// Initialize JWT with a test secret
	utils.InitJWT("test_secret")

	// Create a valid token
	permissions := map[string]string{"clusters": "read"}
	token, err := utils.GenerateToken("testuser", false, permissions)
	assert.NoError(t, err)

	router := setupTestRouter()
	router.Use(middleware.AuthenticateMiddleware())
	router.GET("/test", func(c *gin.Context) {
		username, exists := c.Get("username")
		assert.True(t, exists)
		assert.Equal(t, "testuser", username)

		isAdmin, exists := c.Get("is_admin")
		assert.True(t, exists)
		assert.Equal(t, false, isAdmin)

		userPermissions, exists := c.Get("permissions")
		assert.True(t, exists)
		assert.Equal(t, permissions, userPermissions)

		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAuthenticateMiddleware_NoAuthHeader(t *testing.T) {
	router := setupTestRouter()
	router.Use(middleware.AuthenticateMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Authorization header required")
}

func TestAuthenticateMiddleware_NoBearerPrefix(t *testing.T) {
	router := setupTestRouter()
	router.Use(middleware.AuthenticateMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "invalid_token")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Bearer token required")
}

func TestAuthenticateMiddleware_InvalidToken(t *testing.T) {
	router := setupTestRouter()
	router.Use(middleware.AuthenticateMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid_token")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid token")
}

func TestRequireAdmin_AdminUser(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("is_admin", true)
		c.Next()
	})
	router.Use(middleware.RequireAdmin())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireAdmin_NonAdminUser(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		c.Set("is_admin", false)
		c.Next()
	})
	router.Use(middleware.RequireAdmin())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Admin access required")
}

func TestRequireAdmin_NoAdminFlag(t *testing.T) {
	router := setupTestRouter()
	router.Use(middleware.RequireAdmin())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Admin access required")
}

func TestRequirePermission_ValidPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		permissions := map[string]string{"clusters": "write"}
		c.Set("permissions", permissions)
		c.Next()
	})
	router.Use(middleware.RequirePermission("clusters", "read"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequirePermission_ExactPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		permissions := map[string]string{"clusters": "write"}
		c.Set("permissions", permissions)
		c.Next()
	})
	router.Use(middleware.RequirePermission("clusters", "write"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequirePermission_InsufficientPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		permissions := map[string]string{"clusters": "read"}
		c.Set("permissions", permissions)
		c.Next()
	})
	router.Use(middleware.RequirePermission("clusters", "write"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Insufficient permissions")
}

func TestRequirePermission_NoComponentPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		permissions := map[string]string{"clusters": "read"}
		c.Set("permissions", permissions)
		c.Next()
	})
	router.Use(middleware.RequirePermission("namespaces", "read"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "No permission for this component")
}

func TestRequirePermission_NoPermissions(t *testing.T) {
	router := setupTestRouter()
	router.Use(middleware.RequirePermission("clusters", "read"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "No permissions found")
}

func TestRequirePermission_InvalidRequiredPermission(t *testing.T) {
	router := setupTestRouter()
	router.Use(func(c *gin.Context) {
		permissions := map[string]string{"clusters": "read"}
		c.Set("permissions", permissions)
		c.Next()
	})
	router.Use(middleware.RequirePermission("clusters", "invalid"))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/test", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "Insufficient permissions")
}

// Test the permission logic by creating a test function that mimics the middleware behavior
func TestPermissionLogic(t *testing.T) {
	// Test read permission logic
	assert.True(t, testHasRequiredPermission("read", "read"))
	assert.True(t, testHasRequiredPermission("write", "read"))
	assert.False(t, testHasRequiredPermission("invalid", "read"))

	// Test write permission logic
	assert.False(t, testHasRequiredPermission("read", "write"))
	assert.True(t, testHasRequiredPermission("write", "write"))
	assert.False(t, testHasRequiredPermission("invalid", "write"))

	// Test invalid required permission
	assert.False(t, testHasRequiredPermission("read", "invalid"))
	assert.False(t, testHasRequiredPermission("write", "invalid"))
	assert.False(t, testHasRequiredPermission("invalid", "invalid"))
}

// testHasRequiredPermission is a copy of the middleware function for testing
func testHasRequiredPermission(userPerm, required string) bool {
	switch required {
	case "read":
		return userPerm == "read" || userPerm == "write"
	case "write":
		return userPerm == "write"
	default:
		return false
	}
}
