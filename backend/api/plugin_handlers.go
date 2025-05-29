package api

import (
    "net/http"  // Add this import

    "github.com/gin-gonic/gin"
    "github.com/kubestellar/ui/dynamic_plugins"
    "go.uber.org/zap"
)


var (
    pluginManager *dynamic_plugins.PluginManager
    logger        *zap.Logger
)

// InitializePluginHandlers sets up the plugin manager and logger
func InitializePluginHandlers(pm *dynamic_plugins.PluginManager, l *zap.Logger) {
    pluginManager = pm
    logger = l
}

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
    availablePlugins := []gin.H{
        {
            "id":          "kubestellar-cluster-plugin",
            "name":        "KubeStellar Cluster Management",
            "description": "Plugin for cluster onboarding and detachment operations",
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

    loadedPlugin, exists := pluginManager.GetPlugin(pluginID)
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
        return
    }

    handlers := loadedPlugin.Plugin.GetHandlers()
    metadata := loadedPlugin.Plugin.GetMetadata()

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

    handlerFunc(c)
}