package main

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv" // Add this import
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/marketplace"
	"github.com/kubestellar/ui/backend/models"
	config "github.com/kubestellar/ui/backend/pkg/config"
	"github.com/kubestellar/ui/backend/pkg/plugins"
	"github.com/kubestellar/ui/backend/postgresql"
	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/kubestellar/ui/backend/routes"
	_ "github.com/kubestellar/ui/backend/routes"
	"github.com/kubestellar/ui/backend/utils"
	"go.uber.org/zap"
)

var logger *zap.Logger

func main() {
	// Load .env file FIRST before anything else
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found, using default values")
	}

	// Initialize logger
	initLogger()

	// Load configuration (now it will read from .env)
	cfg := config.LoadConfig()

	// Debug: Log the loaded configuration
	logger.Info("Configuration loaded",
		zap.String("port", cfg.Port),
		zap.String("gin_mode", cfg.GinMode),
		zap.String("database_url", maskPassword(cfg.DatabaseURL)),
		zap.String("storage provider", cfg.StorageProvider),
	)

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Initialize JWT
	utils.InitJWT(cfg.JWTSecret)

	// Initialize database with retry logic for Docker
	logger.Info("Connecting to database...", zap.String("url", maskPassword(cfg.DatabaseURL)))
	if err := database.InitDatabase(cfg.DatabaseURL); err != nil {
		logger.Fatal("Failed to initialize database", zap.Error(err))
	}

	// Run database migrations
	logger.Info("Running database migrations...")
	if err := postgresql.RunMigration(); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}

	// Initialize admin user
	logger.Info("Initializing admin user...")
	if err := initializeAdminUser(); err != nil {
		logger.Fatal("Failed to initialize admin user", zap.Error(err))
	}

	// Debug: Check if admin user exists
	logger.Info("Checking admin user in database...")
	if err := debugCheckAdminUser(); err != nil {
		logger.Error("Failed to check admin user", zap.Error(err))
	}

	// Setup Gin router
	router := gin.Default()

	// Add Zap middleware first
	router.Use(ZapMiddleware())

	// Setup metrics routes
	api.SetupMetricsRoutes(router, logger)

	logger.Info("KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
		if corsOrigin == "" {
			corsOrigin = "http://localhost:5173" // default
		}

		// Use the corsOrigin variable instead of hardcoded value
		if origin == corsOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true") // for cookies/auth
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Setting up comprehensive health endpoints using the existing health routes
	routes.SetupHealthEndpoints(router, logger)

	// Setup authentication routes
	routes.SetupRoutes(router)

	// Initialize Marketplace
	logger.Info("Initializing marketplace...")
	if err := InitializeMarketplace(cfg.StorageProvider); err != nil {
		logger.Error("Error initialize the marketplace", zap.String("error", err.Error()))
	} else {
		logger.Info("Successfully initialize marketplace", zap.String("provider", cfg.StorageProvider))
	}

	// Initialize plugin system
	logger.Info("Initializing plugin system...")
	pluginManager := plugins.NewPluginManager(router)

	pluginsDir := config.GetPluginDirectory()
	logger.Info("Using plugins directory", zap.String("path", pluginsDir))

	pluginRegistry := plugins.NewPluginRegistry(pluginsDir, pluginManager)

	// Set global plugin manager for API access
	api.SetGlobalPluginManager(pluginManager, pluginRegistry)

	// Start plugin discovery and loading
	if err := initializePlugins(pluginRegistry, logger); err != nil {
		logger.Error("Failed to initialize plugins", zap.Error(err))
	} else {
		logger.Info("Plugin system initialized successfully")
	}

	// DEVELOPMENT: Uninstall all plugins (for testing purposes)
	defer func() {
		if err := pluginManager.UninstallAllPlugins(); err != nil {
			logger.Error("Failed to uninstall all plugins", zap.Error(err))
		} else {
			logger.Info("All plugins uninstalled successfully")
		}
	}()

	// Add webhook endpoint (you may want to protect this with auth too)
	router.POST("/api/webhook", api.GitHubWebhookHandler)

	// Graceful shutdown
	go func() {
		// Start server
		logger.Info("Server starting",
			zap.String("port", cfg.Port),
			zap.String("mode", cfg.GinMode),
			zap.String("cors_origin", os.Getenv("CORS_ALLOWED_ORIGIN")))
		logger.Info("Default admin credentials: admin/admin - CHANGE IMMEDIATELY!")
		logger.Info("Health endpoints available:")
		logger.Info("  - Comprehensive health: http://localhost:" + cfg.Port + "/health")
		logger.Info("  - Kubernetes liveness: http://localhost:" + cfg.Port + "/healthz")
		logger.Info("  - Kubernetes readiness: http://localhost:" + cfg.Port + "/readyz")
		logger.Info("  - Simple status: http://localhost:" + cfg.Port + "/status")

		if err := router.Run(":" + cfg.Port); err != nil {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// Close database connection
	if err := database.CloseDatabase(); err != nil {
		logger.Error("Error closing database", zap.Error(err))
	}

	logger.Info("Server exited")
}

// Initialize Zap Logger
func initLogger() {
	config := zap.NewProductionConfig()
	config.Encoding = "json"                // Ensure JSON format
	config.OutputPaths = []string{"stdout"} // Console output (can also log to a file)
	log, err := config.Build()
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}
	logger = log
}

// Helper function to detect WebSocket upgrade requests
func isWebSocketUpgrade(c *gin.Context) bool {
	return strings.ToLower(c.GetHeader("Connection")) == "upgrade" &&
		strings.ToLower(c.GetHeader("Upgrade")) == "websocket"
}

// Fixed Middleware to handle WebSocket connections properly
func ZapMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Check if this is a WebSocket upgrade request
		if isWebSocketUpgrade(c) {
			logger.Info("WebSocket Upgrade Request",
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
				zap.String("ip", c.ClientIP()),
				zap.String("user-agent", c.Request.UserAgent()),
				zap.Any("query-params", c.Request.URL.Query()),
			)

			// Process the WebSocket upgrade
			c.Next()

			// Don't try to log response details for hijacked connections
			return
		}

		// Regular HTTP request handling
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			requestBody = string(bodyBytes)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process the request
		c.Next()

		// Only try to get response details if connection wasn't hijacked
		responseSize := c.Writer.Size()
		headers := c.Request.Header

		// Truncate the request body length
		maxBodyLen := 500
		if len(requestBody) > maxBodyLen {
			requestBody = requestBody[:maxBodyLen] + "...[truncated]"
		}

		// Log in structured JSON format
		logger.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("ip", c.ClientIP()),
			zap.String("user-agent", c.Request.UserAgent()),
			zap.Any("query-params", c.Request.URL.Query()),
			zap.String("request-body", requestBody),
			zap.Any("headers", headers),
			zap.Int("response-size", responseSize),
		)

		// Log errors separately for non-WebSocket requests
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.Error("Request Error",
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.Int("status", c.Writer.Status()),
					zap.String("error", err.Error()),
				)
			}
		}
	}
}

// Helper function to mask password in database URL for logging
func maskPassword(dbURL string) string {
	if strings.Contains(dbURL, "@") {
		parts := strings.Split(dbURL, "@")
		if len(parts) >= 2 {
			userPart := strings.Split(parts[0], ":")
			if len(userPart) >= 3 {
				userPart[len(userPart)-1] = "****"
				parts[0] = strings.Join(userPart, ":")
			}
			return strings.Join(parts, "@")
		}
	}
	return dbURL
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

// initializeAdminUser creates default admin user if no users exist
func initializeAdminUser() error {
	// First check if admin user specifically exists
	adminQuery := "SELECT id, username, is_admin FROM users WHERE username = $1"
	var adminID int
	var adminUsername string
	var isAdmin bool

	err := database.DB.QueryRow(adminQuery, "admin").Scan(&adminID, &adminUsername, &isAdmin)
	if err == nil {
		// Admin user exists
		logger.Info("Admin user already exists",
			zap.Int("id", adminID),
			zap.String("username", adminUsername),
			zap.Bool("is_admin", isAdmin))

		// Verify admin has proper permissions
		return ensureAdminPermissions(adminID)
	}

	// Admin doesn't exist, check if any users exist
	totalUsersQuery := "SELECT COUNT(*) FROM users"
	var count int
	err = database.DB.QueryRow(totalUsersQuery).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check existing users: %v", err)
	}

	logger.Info("Database user status",
		zap.Int("total_users", count),
		zap.Bool("admin_exists", false))

	// Create admin user (either first user or admin is missing)
	log.Println("Creating admin user...")

	// Hash the password
	hashedPassword, err := models.HashPassword("admin")
	if err != nil {
		return fmt.Errorf("failed to hash password: %v", err)
	}

	// Insert admin user
	insertQuery := `
		INSERT INTO users (username, password, is_admin) 
		VALUES ($1, $2, $3) 
		RETURNING id`

	var userID int
	err = database.DB.QueryRow(insertQuery, "admin", hashedPassword, true).Scan(&userID)
	if err != nil {
		return fmt.Errorf("failed to create admin user: %v", err)
	}

	logger.Info("Admin user created", zap.Int("user_id", userID))

	// Set admin permissions for all components
	err = ensureAdminPermissions(userID)
	if err != nil {
		return err
	}

	log.Printf("Default admin user created successfully with username: admin, password: admin")
	return nil
}

// ensureAdminPermissions ensures admin user has all required permissions
func ensureAdminPermissions(userID int) error {
	// Define required admin permissions
	requiredPermissions := []struct {
		component  string
		permission string
	}{
		{"users", "write"},
		{"resources", "write"},
		{"system", "write"},
		{"dashboard", "write"},
	}

	// Check existing permissions
	existingPermsQuery := "SELECT component, permission FROM user_permissions WHERE user_id = $1"
	rows, err := database.DB.Query(existingPermsQuery, userID)
	if err != nil {
		return fmt.Errorf("failed to check existing permissions: %v", err)
	}
	defer rows.Close()

	existingPerms := make(map[string]string)
	for rows.Next() {
		var component, permission string
		if err := rows.Scan(&component, &permission); err != nil {
			return fmt.Errorf("failed to scan permission: %v", err)
		}
		existingPerms[component] = permission
	}

	// Add missing permissions
	for _, perm := range requiredPermissions {
		if existing, exists := existingPerms[perm.component]; !exists || existing != perm.permission {
			// Delete existing permission if different
			if exists {
				_, err = database.DB.Exec(
					"DELETE FROM user_permissions WHERE user_id = $1 AND component = $2",
					userID, perm.component)
				if err != nil {
					return fmt.Errorf("failed to delete old permission: %v", err)
				}
			}

			// Insert new permission
			_, err = database.DB.Exec(
				"INSERT INTO user_permissions (user_id, component, permission) VALUES ($1, $2, $3)",
				userID, perm.component, perm.permission)
			if err != nil {
				return fmt.Errorf("failed to set admin permission %s: %v", perm.component, err)
			}

			logger.Info("Admin permission set",
				zap.String("component", perm.component),
				zap.String("permission", perm.permission))
		}
	}

	return nil
}

// debugCheckAdminUser checks if admin user exists and logs details
func debugCheckAdminUser() error {
	query := "SELECT id, username, password, is_admin FROM users WHERE username = $1"
	var id int
	var username, password string
	var isAdmin bool

	err := database.DB.QueryRow(query, "admin").Scan(&id, &username, &password, &isAdmin)
	if err != nil {
		logger.Error("Admin user not found in database", zap.Error(err))
		return err
	}

	logger.Info("Admin user found in database",
		zap.Int("id", id),
		zap.String("username", username),
		zap.String("password_hash", password),
		zap.Bool("is_admin", isAdmin))

	return nil
}

// initializePlugins initializes the plugin system and loads available plugins
func initializePlugins(registry *plugins.PluginRegistry, logger *zap.Logger) error {
	// Discover available plugins
	pluginInfos, err := registry.DiscoverPlugins()
	if err != nil {
		return fmt.Errorf("failed to discover plugins: %v", err)
	}

	logger.Info("Discovered plugins", zap.Int("count", len(pluginInfos)))

	// Load each discovered plugin
	// We need to fetch the plugin ID as well
	for _, pluginInfo := range pluginInfos {
		logger.Info("Loading plugin",
			zap.Int("id", pluginInfo.ID),
			zap.String("name", pluginInfo.Name),
			zap.String("version", pluginInfo.Version),
			zap.String("status", pluginInfo.Status))

		if pluginInfo.Status == "error" {
			logger.Error("Plugin has errors",
				zap.String("name", pluginInfo.Name),
				zap.String("error", pluginInfo.Error))
			continue
		}

		// Load the plugin
		pluginFolderName := fmt.Sprintf("%s-%d", pluginInfo.Name, pluginInfo.ID)
		fmt.Println("pluginFolderName", pluginFolderName)
		if err := registry.LoadPlugin(pluginFolderName); err != nil {
			logger.Error("Failed to load plugin",
				zap.String("name", pluginInfo.Name),
				zap.Error(err))
			continue
		}

		logger.Info("Successfully loaded plugin", zap.String("name", pluginInfo.Name))
	}

	// Start plugin watcher for hot reloading
	if err := registry.StartWatching(); err != nil {
		logger.Error("Failed to start plugin watcher", zap.Error(err))
	} else {
		logger.Info("Plugin watcher started")
	}

	return nil
}

func InitializeMarketplace(storageProvider string) error {
	// load storage config
	var storeCfg marketplace.StorageConfig
	switch storageProvider {
	case "git":
		remoteURL := config.GetEnv("GIT_REMOTE_URL", "")
		branch := config.GetEnv("GIT_BRANCH", "")
		baseURL := config.GetEnv("GIT_BASE_URL", "")
		token := config.GetEnv("GIT_TOKEN", "")

		logger.Info("git storage config",
			zap.String("remote_url", remoteURL),
			zap.String("branch", branch),
			zap.String("base_url", baseURL))

		storeCfg = marketplace.StorageConfig{
			Type:         marketplace.StorageGit,
			GitRemoteURL: remoteURL,
			GitBranch:    branch,
			GitBaseURL:   baseURL,
			GitToken:     token,
		}
	case "r2":
		bucket := config.GetEnv("R2_BUCKET_NAME", "")
		accessKey := config.GetEnv("R2_ACCESS_KEY", "")
		secretKey := config.GetEnv("R2_SECRET_KEY", "")
		endpoint := config.GetEnv("R2_ENDPOINT", "")

		storeCfg = marketplace.StorageConfig{
			Type:      marketplace.StorageR2,
			Bucket:    bucket,
			AccessKey: accessKey,
			SecretKey: secretKey,
			Endpoint:  endpoint,
		}
	default:
		localBase := "./marketplace/local-plugin"
		baseURL := fmt.Sprintf("https://localhost:%s/marketplace/plugins", config.GetEnv("PORT", "4000"))
		storeCfg = marketplace.StorageConfig{
			Type:      marketplace.StorageLocal,
			LocalBase: localBase,
			BaseURL:   baseURL,
		}
	}

	if err := marketplace.SetGlobalMarketplaceManager(storeCfg); err != nil {
		logger.Error("error setting global marketplace manager", zap.String("error", err.Error()))
		return err
	}
	return nil
}
