package main

import (
    "bytes"
    "io"
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/kubestellar/ui/api"
    "github.com/kubestellar/ui/dynamic_plugins"
    "github.com/kubestellar/ui/routes"
    "go.uber.org/zap"
)

var (
    logger        *zap.Logger
    pluginManager *dynamic_plugins.PluginManager
)

func main() {
    initLogger()
    router := gin.Default()

    router.Use(ZapMiddleware())
    log.Println("Debug: KubestellarUI application started")

    // CORS Middleware
    router.Use(func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")

        corsOrigin := os.Getenv("CORS_ALLOWED_ORIGIN")
        if corsOrigin == "" {
            corsOrigin = "http://localhost:5173" // default
        }

        if origin == corsOrigin {
            c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
            c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        }

        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    })

    // Initialize dynamic plugin system
    initializePluginSystem(router)

    // Setup existing routes
    routes.SetupRoutes(router)

    // Existing webhook route
    router.POST("api/webhook", api.GitHubWebhookHandler)

    // Plugin management routes
    setupPluginRoutes(router)

    log.Println("Server starting on :4000 with dynamic plugin support enabled")
    if err := router.Run(":4000"); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

// initializePluginSystem sets up the dynamic plugin manager
func initializePluginSystem(router *gin.Engine) {
    pluginDir := os.Getenv("PLUGIN_DIR")
    if pluginDir == "" {
        pluginDir = "./dynamic_plugins/cache" // default plugin directory
    }

    // Ensure plugin directory exists
    if err := os.MkdirAll(pluginDir, 0755); err != nil {
        log.Printf("Warning: Failed to create plugin directory %s: %v", pluginDir, err)
    }

    pluginManager = dynamic_plugins.NewPluginManager(router, pluginDir)
    log.Printf("Dynamic plugin system initialized with directory: %s", pluginDir)

    // Optionally load plugins from environment variable on startup
    autoLoadPlugins := os.Getenv("AUTO_LOAD_PLUGINS")
    if autoLoadPlugins != "" {
        repos := strings.Split(autoLoadPlugins, ",")
        for _, repo := range repos {
            repo = strings.TrimSpace(repo)
            if repo != "" {
                go func(repoURL string) {
                    log.Printf("Auto-loading plugin from: %s", repoURL)
                    if err := pluginManager.LoadPluginFromGitHub(repoURL); err != nil {
                        log.Printf("Failed to auto-load plugin from %s: %v", repoURL, err)
                    } else {
                        log.Printf("Successfully auto-loaded plugin from %s", repoURL)
                    }
                }(repo)
            }
        }
    }
}

// setupPluginRoutes sets up the plugin management API endpoints
func setupPluginRoutes(router *gin.Engine) {
    pluginGroup := router.Group("/api/plugins")
    {
        // Load plugin from GitHub repository
        pluginGroup.POST("/load", LoadPluginFromGitHubHandler)

        // Load plugin from local file
        pluginGroup.POST("/load-local", LoadPluginFromFileHandler)

        // List all loaded plugins
        pluginGroup.GET("", ListPluginsHandler)

        // Plugin discovery (list available plugins from registry)
        pluginGroup.GET("/discover", DiscoverPluginsHandler)

        // Plugin-specific routes with different base path to avoid conflicts
        pluginGroup.GET("/:id", GetPluginHandler)
        pluginGroup.DELETE("/:id", UnloadPluginHandler)
        pluginGroup.GET("/:id/health", GetPluginHealthHandler)
    }

    // Plugin endpoint calls - Use a different route structure to avoid conflicts
    pluginEndpointGroup := router.Group("/api/plugin-endpoints")
    {
        pluginEndpointGroup.Any("/:pluginId/*endpoint", CallPluginEndpointHandler)
    }

    log.Println("Plugin management routes registered:")
    log.Println("  POST   /api/plugins/load")
    log.Println("  POST   /api/plugins/load-local")
    log.Println("  GET    /api/plugins")
    log.Println("  GET    /api/plugins/:id")
    log.Println("  DELETE /api/plugins/:id")
    log.Println("  GET    /api/plugins/:id/health")
    log.Println("  GET    /api/plugins/discover")
    log.Println("  ANY    /api/plugin-endpoints/:pluginId/*endpoint")
}

// Plugin management handlers

// LoadPluginFromGitHubHandler handles requests to load plugins from GitHub
func LoadPluginFromGitHubHandler(c *gin.Context) {
    var req struct {
        RepoURL string `json:"repoUrl" binding:"required"`
        Version string `json:"version,omitempty"`
    }

    if err := c.BindJSON(&req); err != nil {
        logger.Error("Invalid plugin load request", zap.Error(err))
        c.JSON(400, gin.H{"error": "Invalid request payload"})
        return
    }

    logger.Info("Loading plugin from GitHub",
        zap.String("repoUrl", req.RepoURL),
        zap.String("version", req.Version))

    if err := pluginManager.LoadPluginFromGitHub(req.RepoURL); err != nil {
        logger.Error("Failed to load plugin",
            zap.String("repoUrl", req.RepoURL),
            zap.Error(err))
        c.JSON(500, gin.H{
            "error":   "Failed to load plugin",
            "details": err.Error(),
        })
        return
    }

    logger.Info("Plugin loaded successfully", zap.String("repoUrl", req.RepoURL))
    c.JSON(200, gin.H{
        "message": "Plugin loaded successfully",
        "repoUrl": req.RepoURL,
    })
}

// LoadPluginFromFileHandler handles requests to load plugins from local files
func LoadPluginFromFileHandler(c *gin.Context) {
    var req struct {
        PluginPath   string `json:"pluginPath" binding:"required"`
        ManifestPath string `json:"manifestPath" binding:"required"`
    }

    if err := c.BindJSON(&req); err != nil {
        logger.Error("Invalid local plugin load request", zap.Error(err))
        c.JSON(400, gin.H{"error": "Invalid request payload"})
        return
    }

    logger.Info("Loading plugin from local file",
        zap.String("pluginPath", req.PluginPath),
        zap.String("manifestPath", req.ManifestPath))

    if err := pluginManager.LoadPluginFromFile(req.PluginPath, req.ManifestPath); err != nil {
        logger.Error("Failed to load local plugin",
            zap.String("pluginPath", req.PluginPath),
            zap.Error(err))
        c.JSON(500, gin.H{
            "error":   "Failed to load plugin",
            "details": err.Error(),
        })
        return
    }

    logger.Info("Local plugin loaded successfully", zap.String("pluginPath", req.PluginPath))
    c.JSON(200, gin.H{
        "message":    "Plugin loaded successfully",
        "pluginPath": req.PluginPath,
    })
}

// ListPluginsHandler returns all loaded plugins
func ListPluginsHandler(c *gin.Context) {
    plugins := pluginManager.ListPlugins()
    logger.Info("Listing plugins", zap.Int("count", len(plugins)))

    c.JSON(200, gin.H{
        "plugins": plugins,
        "count":   len(plugins),
    })
}

// UnloadPluginHandler handles plugin unloading
func UnloadPluginHandler(c *gin.Context) {
    pluginID := c.Param("id")
    if pluginID == "" {
        c.JSON(400, gin.H{"error": "Plugin ID is required"})
        return
    }

    logger.Info("Unloading plugin", zap.String("pluginId", pluginID))

    if err := pluginManager.UnloadPlugin(pluginID); err != nil {
        logger.Error("Failed to unload plugin",
            zap.String("pluginId", pluginID),
            zap.Error(err))
        c.JSON(500, gin.H{
            "error":   "Failed to unload plugin",
            "details": err.Error(),
        })
        return
    }

    logger.Info("Plugin unloaded successfully", zap.String("pluginId", pluginID))
    c.JSON(200, gin.H{
        "message":  "Plugin unloaded successfully",
        "pluginId": pluginID,
    })
}

// GetPluginHandler returns information about a specific plugin
func GetPluginHandler(c *gin.Context) {
    pluginID := c.Param("id")
    if pluginID == "" {
        c.JSON(400, gin.H{"error": "Plugin ID is required"})
        return
    }

    plugin, exists := pluginManager.GetPlugin(pluginID)
    if !exists {
        c.JSON(404, gin.H{"error": "Plugin not found"})
        return
    }

    c.JSON(200, gin.H{
        "plugin": plugin.Metadata,
        "routes": plugin.Routes,
        "status": "loaded",
    })
}

// GetPluginHealthHandler checks plugin health
func GetPluginHealthHandler(c *gin.Context) {
    pluginID := c.Param("id")
    if pluginID == "" {
        c.JSON(400, gin.H{"error": "Plugin ID is required"})
        return
    }

    plugin, exists := pluginManager.GetPlugin(pluginID)
    if !exists {
        c.JSON(404, gin.H{"error": "Plugin not found"})
        return
    }

    err := plugin.Plugin.Health()
    if err != nil {
        c.JSON(503, gin.H{
            "status": "unhealthy",
            "error":  err.Error(),
        })
        return
    }

    c.JSON(200, gin.H{
        "status":   "healthy",
        "pluginId": pluginID,
    })
}

// DiscoverPluginsHandler returns available plugins from registry
func DiscoverPluginsHandler(c *gin.Context) {
    // This is a placeholder for plugin discovery functionality
    // In a real implementation, this might query a plugin registry

    availablePlugins := []gin.H{
        {
            "id":          "kubestellar-cluster-plugin",
            "name":        "KubeStellar Cluster Management",
            "description": "Plugin for cluster onboarding and detachment operations dummy",
            "version":     "1.0.0",
            "repoUrl":     "https://github.com/ansh7432/plugin",
            "official":    true,
        },
        
    }

    c.JSON(200, gin.H{
        "available": availablePlugins,
        "count":     len(availablePlugins),
    })
}

// CallPluginEndpointHandler calls a specific plugin endpoint
func CallPluginEndpointHandler(c *gin.Context) {
    pluginID := c.Param("pluginId")
    endpoint := c.Param("endpoint")

    // Get the loaded plugin
    loadedPlugin, exists := pluginManager.GetPlugin(pluginID)
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
        return
    }

    // Get the plugin's handlers
    handlers := loadedPlugin.Plugin.GetHandlers()
    metadata := loadedPlugin.Plugin.GetMetadata()

    // Find the handler for this endpoint
    var handlerFunc gin.HandlerFunc
    var found bool

    for _, endpointConfig := range metadata.Endpoints {
        if endpointConfig.Path == endpoint {
            if handler, exists := handlers[endpointConfig.Handler]; exists {
                handlerFunc = handler
                found = true
                break
            }
        }
    }

    if !found {
        c.JSON(http.StatusNotFound, gin.H{"error": "Endpoint not found"})
        return
    }

    // Call the handler
    handlerFunc(c)
}

// Initialize Zap Logger
func initLogger() {
    config := zap.NewProductionConfig()
    config.Encoding = "json"                // Ensure JSON format
    config.OutputPaths = []string{"stdout"} // Console output (can also log to a file)
    log, _ := config.Build()
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

func homeDir() string {
    if h := os.Getenv("HOME"); h != "" {
        return h
    }
    return os.Getenv("USERPROFILE") // windows
}