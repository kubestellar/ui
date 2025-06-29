package routes

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/auth"
	"github.com/kubestellar/ui/middleware"
	"github.com/kubestellar/ui/models"
	database "github.com/kubestellar/ui/postgresql/Database"
	"github.com/kubestellar/ui/utils"
)

// SetupRoutes initializes all routes - THIS IS THE MISSING FUNCTION!
func setupdebug(router *gin.Engine) {
	setupHealthRoute(router)

	// Temporary debug endpoint - REMOVE IN PRODUCTION
	router.GET("/debug/admin", func(c *gin.Context) {
		// Check if admin user exists
		query := "SELECT id, username, password, is_admin FROM users WHERE username = $1"
		var id int
		var username, password string
		var isAdmin bool

		err := database.DB.QueryRow(query, "admin").Scan(&id, &username, &password, &isAdmin)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Admin user not found", "details": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":            id,
			"username":      username,
			"password_hash": password,
			"is_admin":      isAdmin,
		})
	})

	// Debug endpoint to check all users in database
	router.GET("/debug/users", func(c *gin.Context) {
		query := "SELECT id, username, password, is_admin FROM users"
		rows, err := database.DB.Query(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query users", "details": err.Error()})
			return
		}
		defer rows.Close()

		var users []gin.H
		for rows.Next() {
			var id int
			var username, password string
			var isAdmin bool

			err := rows.Scan(&id, &username, &password, &isAdmin)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan user", "details": err.Error()})
				return
			}

			users = append(users, gin.H{
				"id":            id,
				"username":      username,
				"password_hash": password,
				"is_admin":      isAdmin,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"users": users,
			"total": len(users),
		})
	})

	// Debug endpoint to check user permissions table
	router.GET("/debug/permissions", func(c *gin.Context) {
		query := "SELECT user_id, component, permission FROM user_permissions"
		rows, err := database.DB.Query(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query permissions", "details": err.Error()})
			return
		}
		defer rows.Close()

		var permissions []gin.H
		for rows.Next() {
			var userID int
			var component, permission string

			err := rows.Scan(&userID, &component, &permission)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan permission", "details": err.Error()})
				return
			}

			permissions = append(permissions, gin.H{
				"user_id":    userID,
				"component":  component,
				"permission": permission,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"permissions": permissions,
			"total":       len(permissions),
		})
	})
}

// setupHealthRoutes adds the missing health check routes
func setupHealthRoute(router *gin.Engine) {
	// Liveness probe
	router.GET("/apih", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "alive",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// Readiness probe
	router.GET("/readyz", func(c *gin.Context) {
		// Check if database is ready
		if err := database.DB.Ping(); err != nil {
			c.JSON(503, gin.H{
				"status":    "not ready",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"error":     "database not ready",
			})
			return
		}

		c.JSON(200, gin.H{
			"status":    "ready",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// Enhanced health check with component status
	router.GET("/health/detailed", func(c *gin.Context) {
		dbStatus := "healthy"
		dbMessage := "database connection successful"
		dbLatency := "0ms"

		start := time.Now()
		if err := database.DB.Ping(); err != nil {
			dbStatus = "unhealthy"
			dbMessage = "database connection failed: " + err.Error()
		} else {
			dbLatency = time.Since(start).String()
		}

		c.JSON(200, gin.H{
			"status":      "healthy",
			"service":     "kubestellar-ui",
			"version":     "1.0.0",
			"timestamp":   time.Now().UTC().Format(time.RFC3339),
			"uptime":      time.Since(startTime).String(),
			"environment": "debug",
			"components": gin.H{
				"database": gin.H{
					"status":  dbStatus,
					"message": dbMessage,
					"latency": dbLatency,
				},
			},
		})
	})
}

// setupAuthRoutes initializes authentication-related routes
func setupAuthRoutes(router *gin.Engine) {

	setupdebug(router) // Add debug routes for testing
	// Public routes (no authentication required)
	router.POST("/login", LoginHandler)

	// Remove this duplicate health check since main.go already has one
	// router.GET("/api/health", func(c *gin.Context) {
	//	c.JSON(200, gin.H{
	//		"status":  "healthy",
	//		"service": "auth-system",
	//		"version": "1.0.0",
	//	})
	// })

	// API group - ALL endpoints require authentication
	api := router.Group("/api")
	api.Use(middleware.AuthenticateMiddleware()) // Apply authentication to ALL API routes
	{
		// Basic authenticated user endpoints
		api.GET("/me", CurrentUserHandler)
		api.PUT("/me/password", ChangePasswordHandler)

		// Component-based permission routes - ALL require authentication FIRST
		setupComponentRoutes(api)

		// Admin-only endpoints - require authentication AND admin role
		admin := api.Group("/admin")
		admin.Use(middleware.RequireAdmin())
		{
			admin.GET("/users", ListUsersHandler)
			admin.POST("/users", CreateUserHandler)
			admin.PUT("/users/:username", UpdateUserHandler)
			admin.DELETE("/users/:username", DeleteUserHandler)
			admin.GET("/users/:username/permissions", GetUserPermissionsHandler)
			admin.PUT("/users/:username/permissions", SetUserPermissionsHandler)
		}
	}
}

// setupComponentRoutes sets up routes for different components with permissions
func setupComponentRoutes(protected *gin.RouterGroup) {
	// Resources component routes - ALL require authentication + specific permissions
	resources := protected.Group("/resources")
	{
		// Read access - must be authenticated AND have read permission for resources
		resources.GET("/", middleware.RequirePermission("resources", "read"), GetResourcesHandler)
		resources.GET("/:id", middleware.RequirePermission("resources", "read"), GetResourceHandler)

		// Write access - must be authenticated AND have write permission for resources
		resources.POST("/", middleware.RequirePermission("resources", "write"), CreateResourceHandler)
		resources.PUT("/:id", middleware.RequirePermission("resources", "write"), UpdateResourceHandler)
		resources.DELETE("/:id", middleware.RequirePermission("resources", "write"), DeleteResourceHandler)
	}

	// System component routes - ALL require authentication + specific permissions
	system := protected.Group("/system")
	{
		// Read access - must be authenticated AND have read permission for system
		system.GET("/status", middleware.RequirePermission("system", "read"), GetSystemStatusHandler)
		system.GET("/config", middleware.RequirePermission("system", "read"), GetSystemConfigHandler)

		// Write access - must be authenticated AND have write permission for system
		system.PUT("/config", middleware.RequirePermission("system", "write"), UpdateSystemConfigHandler)
		system.POST("/restart", middleware.RequirePermission("system", "write"), RestartSystemHandler)
	}

	// Dashboard component routes - ALL require authentication + specific permissions
	dashboard := protected.Group("/dashboard")
	{
		// Read access - must be authenticated AND have read permission for dashboard
		dashboard.GET("/stats", middleware.RequirePermission("dashboard", "read"), GetDashboardStatsHandler)
		dashboard.GET("/charts", middleware.RequirePermission("dashboard", "read"), GetDashboardChartsHandler)

		// Write access - must be authenticated AND have write permission for dashboard
		dashboard.POST("/widgets", middleware.RequirePermission("dashboard", "write"), CreateDashboardWidgetHandler)
		dashboard.PUT("/widgets/:id", middleware.RequirePermission("dashboard", "write"), UpdateDashboardWidgetHandler)
		dashboard.DELETE("/widgets/:id", middleware.RequirePermission("dashboard", "write"), DeleteDashboardWidgetHandler)
	}
}

// ===================================
// Authentication Handlers
// ===================================

// LoginHandler verifies user credentials and issues JWT
func LoginHandler(c *gin.Context) {
	var loginData struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Validate input
	loginData.Username = strings.TrimSpace(loginData.Username)
	loginData.Password = strings.TrimSpace(loginData.Password)

	if loginData.Username == "" || loginData.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	// TEMPORARY: Try direct database authentication for debugging
	if loginData.Username == "admin" && loginData.Password == "admin" {
		// Get user directly from database
		query := "SELECT id, username, password, is_admin FROM users WHERE username = $1"
		var id int
		var username, dbPassword string
		var isAdmin bool

		err := database.DB.QueryRow(query, "admin").Scan(&id, &username, &dbPassword, &isAdmin)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in database"})
			return
		}

		// Check if password matches using bcrypt
		if models.CheckPasswordHash(loginData.Password, dbPassword) {
			// Create a simple user object for response
			user := struct {
				ID          int               `json:"id"`
				Username    string            `json:"username"`
				IsAdmin     bool              `json:"is_admin"`
				Permissions map[string]string `json:"permissions"`
			}{
				ID:       id,
				Username: username,
				IsAdmin:  isAdmin,
				Permissions: map[string]string{
					"users":     "write",
					"resources": "write",
					"system":    "write",
					"dashboard": "write",
				},
			}

			// Generate JWT token
			token, err := utils.GenerateToken(user.Username, user.IsAdmin, user.Permissions)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
				return
			}

			// Return success response
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"token":   token,
				"user": gin.H{
					"username":    user.Username,
					"is_admin":    user.IsAdmin,
					"permissions": user.Permissions,
				},
			})
			return
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Password mismatch",
				"debug": "Bcrypt verification failed for stored hash: " + dbPassword,
			})
			return
		}
	}

	// Get user from database
	query := "SELECT id, username, password, is_admin FROM users WHERE username = $1"
	var id int
	var username, dbPassword string
	var isAdmin bool

	err := database.DB.QueryRow(query, loginData.Username).Scan(&id, &username, &dbPassword, &isAdmin)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Verify password using bcrypt
	if !models.CheckPasswordHash(loginData.Password, dbPassword) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Get user permissions
	permissionsQuery := "SELECT component, permission FROM user_permissions WHERE user_id = $1"
	permRows, err := database.DB.Query(permissionsQuery, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user permissions"})
		return
	}
	defer permRows.Close()

	permissions := make(map[string]string)
	for permRows.Next() {
		var component, permission string
		err := permRows.Scan(&component, &permission)
		if err != nil {
			continue
		}
		permissions[component] = permission
	}

	// If admin user has no specific permissions, give them all permissions
	if isAdmin && len(permissions) == 0 {
		permissions = map[string]string{
			"users":     "write",
			"resources": "write",
			"system":    "write",
			"dashboard": "write",
		}
	}

	// Generate JWT token
	token, err := utils.GenerateToken(username, isAdmin, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token generation failed"})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
		"user": gin.H{
			"username":    username,
			"is_admin":    isAdmin,
			"permissions": permissions,
		},
	})
}

// RegisterHandler creates a new user (removed - no public registration)
// Public registration has been removed for security. Only admins can create users.

// CurrentUserHandler returns the current user's information
func CurrentUserHandler(c *gin.Context) {
	username, exists := c.Get("username")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}

	isAdmin, _ := c.Get("is_admin")
	permissions, _ := c.Get("permissions")

	c.JSON(http.StatusOK, gin.H{
		"username":    username,
		"is_admin":    isAdmin,
		"permissions": permissions,
	})
}

// ChangePasswordHandler allows users to change their own password
func ChangePasswordHandler(c *gin.Context) {
	var passwordData struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&passwordData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	username, _ := c.Get("username")

	// Verify current password
	user, err := models.AuthenticateUser(username.(string), passwordData.CurrentPassword)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Update password
	err = models.UpdateUserPassword(user.ID, passwordData.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// ===================================
// Admin User Management Handlers
// ===================================

// ListUsersHandler returns a list of all users (admin only)
func ListUsersHandler(c *gin.Context) {
	// First, let's try a direct database query to check if users exist
	query := "SELECT COUNT(*) FROM users"
	var count int
	err := database.DB.QueryRow(query).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to check user table",
			"details": err.Error(),
		})
		return
	}

	if count == 0 {
		c.JSON(http.StatusOK, gin.H{
			"users":   []gin.H{},
			"message": "No users found in database",
		})
		return
	}

	// Try to get users directly from database
	usersQuery := `
		SELECT u.id, u.username, u.is_admin, u.created_at, u.updated_at,
		       COALESCE(up.component, '') as component, 
		       COALESCE(up.permission, '') as permission
		FROM users u
		LEFT JOIN user_permissions up ON u.id = up.user_id
		ORDER BY u.id, up.component
	`

	rows, err := database.DB.Query(usersQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to query users",
			"details": err.Error(),
		})
		return
	}
	defer rows.Close()

	userMap := make(map[int]gin.H)

	for rows.Next() {
		var id int
		var username string
		var isAdmin bool
		var createdAt, updatedAt string
		var component, permission string

		err := rows.Scan(&id, &username, &isAdmin, &createdAt, &updatedAt, &component, &permission)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to scan user row",
				"details": err.Error(),
			})
			return
		}

		// Initialize user if not exists
		if _, exists := userMap[id]; !exists {
			userMap[id] = gin.H{
				"id":          id,
				"username":    username,
				"is_admin":    isAdmin,
				"created_at":  createdAt,
				"updated_at":  updatedAt,
				"permissions": make(map[string]string),
			}
		}

		// Add permission if it exists
		if component != "" && permission != "" {
			permissions := userMap[id]["permissions"].(map[string]string)
			permissions[component] = permission
		}
	}

	// Convert map to slice
	var users []gin.H
	for _, user := range userMap {
		users = append(users, user)
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"total": len(users),
	})
}

// CreateUserHandler creates a new user (admin only)
func CreateUserHandler(c *gin.Context) {
	var userData struct {
		Username    string            `json:"username" binding:"required"`
		Password    string            `json:"password" binding:"required"`
		IsAdmin     bool              `json:"is_admin"`
		Permissions map[string]string `json:"permissions"`
	}

	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Create user
	user, err := models.CreateUser(userData.Username, userData.Password, userData.IsAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create user",
			"details": err.Error(),
		})
		return
	}

	// Set permissions if provided
	if userData.Permissions != nil {
		var permSlice []models.Permission
		for component, permission := range userData.Permissions {
			permSlice = append(permSlice, models.Permission{
				Component:  component,
				Permission: permission,
			})
		}

		err = models.SetUserPermissions(user.ID, permSlice)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "User created but failed to set permissions",
				"details": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "User created successfully",
		"username": userData.Username,
	})
}

// UpdateUserHandler updates an existing user (admin only)
func UpdateUserHandler(c *gin.Context) {
	username := c.Param("username")

	var userData struct {
		Password    string            `json:"password"`
		Permissions map[string]string `json:"permissions"`
	}

	if err := c.ShouldBindJSON(&userData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Get existing user
	user, err := models.GetUserByUsername(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update password if provided
	if userData.Password != "" {
		err = models.UpdateUserPassword(user.ID, userData.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update password",
				"details": err.Error(),
			})
			return
		}
	}

	// Update permissions if provided
	if userData.Permissions != nil {
		var permSlice []models.Permission
		for component, permission := range userData.Permissions {
			permSlice = append(permSlice, models.Permission{
				Component:  component,
				Permission: permission,
			})
		}

		err = models.SetUserPermissions(user.ID, permSlice)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update permissions",
				"details": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "User updated successfully",
		"username": username,
	})
}

// DeleteUserHandler deletes a user (admin only)
func DeleteUserHandler(c *gin.Context) {
	username := c.Param("username")

	// Prevent deleting the last admin user
	if username == "admin" {
		users, err := models.ListAllUsers()
		if err == nil {
			adminCount := 0
			for _, user := range users {
				if user.IsAdmin {
					adminCount++
				}
			}
			if adminCount <= 1 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last admin user"})
				return
			}
		}
	}

	err := auth.RemoveUser(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete user",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "User deleted successfully",
		"username": username,
	})
}

// GetUserPermissionsHandler gets permissions for a specific user
func GetUserPermissionsHandler(c *gin.Context) {
	username := c.Param("username")

	user, err := models.GetUserByUsername(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"username":    user.Username,
		"permissions": user.Permissions,
	})
}

// SetUserPermissionsHandler sets permissions for a specific user
func SetUserPermissionsHandler(c *gin.Context) {
	username := c.Param("username")

	var permData struct {
		Permissions map[string]string `json:"permissions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&permData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	user, err := models.GetUserByUsername(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var permSlice []models.Permission
	for component, permission := range permData.Permissions {
		if permission != "read" && permission != "write" && permission != "none" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission value. Must be 'read', 'write', or 'none'"})
			return
		}
		if permission != "none" {
			permSlice = append(permSlice, models.Permission{
				Component:  component,
				Permission: permission,
			})
		}
	}

	err = models.SetUserPermissions(user.ID, permSlice)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to set permissions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Permissions updated successfully",
		"username":    username,
		"permissions": permData.Permissions,
	})
}

// ===================================
// Resource Component Handlers
// ===================================

func GetResourcesHandler(c *gin.Context) {
	// Mock data - replace with actual database queries
	resources := []gin.H{
		{"id": 1, "name": "Resource 1", "type": "server", "status": "active"},
		{"id": 2, "name": "Resource 2", "type": "database", "status": "inactive"},
	}
	c.JSON(http.StatusOK, gin.H{"resources": resources})
}

func GetResourceHandler(c *gin.Context) {
	id := c.Param("id")
	// Mock data - replace with actual database query
	resource := gin.H{"id": id, "name": "Resource " + id, "type": "server", "status": "active"}
	c.JSON(http.StatusOK, gin.H{"resource": resource})
}

// GetResourceByID - alias for individual resource access
func GetResourceByIDHandler(c *gin.Context) {
	GetResourceHandler(c)
}

func CreateResourceHandler(c *gin.Context) {
	var resourceData struct {
		Name string `json:"name" binding:"required"`
		Type string `json:"type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&resourceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Mock creation - replace with actual database insert
	c.JSON(http.StatusCreated, gin.H{
		"message": "Resource created successfully",
		"resource": gin.H{
			"id":   123,
			"name": resourceData.Name,
			"type": resourceData.Type,
		},
	})
}

func UpdateResourceHandler(c *gin.Context) {
	id := c.Param("id")
	var resourceData struct {
		Name   string `json:"name"`
		Status string `json:"status"`
	}

	if err := c.ShouldBindJSON(&resourceData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Mock update - replace with actual database update
	c.JSON(http.StatusOK, gin.H{
		"message": "Resource updated successfully",
		"id":      id,
	})
}

func DeleteResourceHandler(c *gin.Context) {
	id := c.Param("id")
	// Mock deletion - replace with actual database delete
	c.JSON(http.StatusOK, gin.H{
		"message": "Resource deleted successfully",
		"id":      id,
	})
}

// ===================================
// System Component Handlers
// ===================================

func GetSystemStatusHandler(c *gin.Context) {
	// Mock system status - replace with actual system checks
	status := gin.H{
		"status":     "healthy",
		"uptime":     "72h 15m",
		"cpu_usage":  "45%",
		"memory":     "67%",
		"disk_space": "23%",
	}
	c.JSON(http.StatusOK, gin.H{"system": status})
}

func GetSystemConfigHandler(c *gin.Context) {
	// Mock configuration - replace with actual config retrieval
	config := gin.H{
		"max_connections": 1000,
		"timeout":         30,
		"debug_mode":      false,
		"log_level":       "info",
	}
	c.JSON(http.StatusOK, gin.H{"config": config})
}

func UpdateSystemConfigHandler(c *gin.Context) {
	var configData map[string]interface{}

	if err := c.ShouldBindJSON(&configData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Mock config update - replace with actual config update
	c.JSON(http.StatusOK, gin.H{
		"message": "System configuration updated successfully",
		"config":  configData,
	})
}

func RestartSystemHandler(c *gin.Context) {
	// Mock system restart - replace with actual restart logic
	c.JSON(http.StatusOK, gin.H{"message": "System restart initiated"})
}

// ===================================
// Dashboard Component Handlers
// ===================================

func GetDashboardStatsHandler(c *gin.Context) {
	// Mock dashboard stats - replace with actual data
	stats := gin.H{
		"total_users":     42,
		"active_sessions": 15,
		"total_resources": 128,
		"alerts":          3,
	}
	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

func GetDashboardChartsHandler(c *gin.Context) {
	// Mock chart data - replace with actual data
	charts := gin.H{
		"cpu_usage": []gin.H{
			{"time": "00:00", "value": 45},
			{"time": "01:00", "value": 52},
			{"time": "02:00", "value": 38},
		},
		"memory_usage": []gin.H{
			{"time": "00:00", "value": 67},
			{"time": "01:00", "value": 72},
			{"time": "02:00", "value": 69},
		},
	}
	c.JSON(http.StatusOK, gin.H{"charts": charts})
}

func CreateDashboardWidgetHandler(c *gin.Context) {
	var widgetData struct {
		Name string `json:"name" binding:"required"`
		Type string `json:"type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&widgetData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Mock widget creation - replace with actual database insert
	c.JSON(http.StatusCreated, gin.H{
		"message": "Dashboard widget created successfully",
		"widget": gin.H{
			"id":   456,
			"name": widgetData.Name,
			"type": widgetData.Type,
		},
	})
}

func UpdateDashboardWidgetHandler(c *gin.Context) {
	id := c.Param("id")
	var widgetData map[string]interface{}

	if err := c.ShouldBindJSON(&widgetData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Mock widget update - replace with actual database update
	c.JSON(http.StatusOK, gin.H{
		"message": "Dashboard widget updated successfully",
		"id":      id,
	})
}

func DeleteDashboardWidgetHandler(c *gin.Context) {
	id := c.Param("id")
	// Mock widget deletion - replace with actual database delete
	c.JSON(http.StatusOK, gin.H{
		"message": "Dashboard widget deleted successfully",
		"id":      id,
	})
}
