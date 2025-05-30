package api

import (
	"net/http"
	"strings"

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

// CORE PLUGIN MANAGEMENT

// LoadPluginFromGitHubHandler handles requests to load plugins from GitHub
func LoadPluginFromGitHubHandler(c *gin.Context) {
	var req struct {
		RepoURL string `json:"repoUrl" binding:"required"`
		Version string `json:"version,omitempty"`
	}

	if err := c.BindJSON(&req); err != nil {
		logger.Error("Invalid plugin load request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	logger.Info("Loading plugin from GitHub",
		zap.String("repoUrl", req.RepoURL),
		zap.String("version", req.Version))

	if err := pluginManager.LoadPluginFromGitHub(req.RepoURL); err != nil {
		logger.Error("Failed to load plugin",
			zap.String("repoUrl", req.RepoURL),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to load plugin",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Plugin loaded successfully", zap.String("repoUrl", req.RepoURL))
	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin loaded successfully",
		"repoUrl": req.RepoURL,
	})
}

// ListPluginsHandler returns all loaded plugins
func ListPluginsHandler(c *gin.Context) {
	plugins := pluginManager.ListPlugins()
	logger.Info("Listing plugins", zap.Int("count", len(plugins)))

	c.JSON(http.StatusOK, gin.H{
		"plugins": plugins,
		"count":   len(plugins),
	})
}

// UnloadPluginHandler handles plugin unloading
func UnloadPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	logger.Info("Unloading plugin", zap.String("pluginId", pluginID))

	if err := pluginManager.UnloadPlugin(pluginID); err != nil {
		logger.Error("Failed to unload plugin",
			zap.String("pluginId", pluginID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to unload plugin",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Plugin unloaded successfully", zap.String("pluginId", pluginID))
	c.JSON(http.StatusOK, gin.H{
		"message":  "Plugin unloaded successfully",
		"pluginId": pluginID,
	})
}

// GetPluginHandler returns information about a specific plugin
func GetPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	plugin, exists := pluginManager.GetPlugin(pluginID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plugin": plugin.Metadata,
		"routes": plugin.Routes,
		"status": "loaded",
	})
}

// GetPluginHealthHandler checks plugin health
func GetPluginHealthHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	plugin, exists := pluginManager.GetPlugin(pluginID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	err := plugin.Plugin.Health()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "unhealthy",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
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

	c.JSON(http.StatusOK, gin.H{
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

// LOCAL PLUGIN TESTING

type LoadLocalPluginRequest struct {
	PluginPath   string `json:"pluginPath" binding:"required"`
	ManifestPath string `json:"manifestPath"`
}

type UnloadLocalPluginRequest struct {
	PluginID string `json:"pluginId" binding:"required"`
}

// LoadLocalPluginHandler loads a plugin from local file system
func LoadLocalPluginHandler(c *gin.Context) {
	var req LoadLocalPluginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid local plugin load request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	// Set default manifest path if not provided
	manifestPath := req.ManifestPath
	if manifestPath == "" {
		manifestPath = strings.Replace(req.PluginPath, ".so", ".yaml", 1)
	}

	logger.Info("Loading local plugin for testing",
		zap.String("pluginPath", req.PluginPath),
		zap.String("manifestPath", manifestPath))

	if err := pluginManager.LoadPluginFromFile(req.PluginPath, manifestPath); err != nil {
		logger.Error("Failed to load local plugin",
			zap.String("pluginPath", req.PluginPath),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to load local plugin",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Local plugin loaded successfully for testing", zap.String("pluginPath", req.PluginPath))
	c.JSON(http.StatusOK, gin.H{
		"message":      "Local plugin loaded successfully",
		"type":         "local",
		"pluginPath":   req.PluginPath,
		"manifestPath": manifestPath,
	})
}

// UnloadLocalPluginHandler unloads a local plugin
func UnloadLocalPluginHandler(c *gin.Context) {
	var req UnloadLocalPluginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid unload request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Unloading local plugin", zap.String("pluginId", req.PluginID))

	if err := pluginManager.UnloadPlugin(req.PluginID); err != nil {
		logger.Error("Failed to unload local plugin",
			zap.String("pluginId", req.PluginID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to unload local plugin",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Local plugin unloaded successfully", zap.String("pluginId", req.PluginID))
	c.JSON(http.StatusOK, gin.H{
		"message":  "Local plugin unloaded successfully",
		"type":     "local",
		"pluginId": req.PluginID,
	})
}

// ListLocalPluginsHandler lists all locally loaded plugins
func ListLocalPluginsHandler(c *gin.Context) {
	plugins := pluginManager.ListPlugins()

	// Mark all as local for this endpoint
	localPlugins := make(map[string]interface{})
	for id, plugin := range plugins {
		localPlugins[id] = gin.H{
			"id":     id,
			"type":   "local",
			"plugin": plugin,
		}
	}

	logger.Info("Listing local plugins", zap.Int("count", len(localPlugins)))
	c.JSON(http.StatusOK, gin.H{
		"count":        len(localPlugins),
		"type":         "local",
		"localPlugins": localPlugins,
	})
}

// BuildLocalPluginHandler provides build information for local development
func BuildLocalPluginHandler(c *gin.Context) {
	buildInfo := gin.H{
		"buildCommand": "go build -buildmode=plugin -ldflags='-w -s' -o plugin.so main.go",
		"requirements": []string{
			"main.go with NewPlugin() function",
			"plugin.yaml manifest file",
			"Compatible with plugin interface",
		},
		"example": gin.H{
			"directory":    "./example_plugins/cluster-plugin/",
			"pluginPath":   "./example_plugins/cluster-plugin/cluster-plugin.so",
			"manifestPath": "./example_plugins/cluster-plugin/plugin.yaml",
		},
	}

	c.JSON(http.StatusOK, buildInfo)
}

// GITHUB REPOSITORY HANDLERS

type InstallGitHubRepositoryRequest struct {
	RepoURL        string  `json:"repoUrl" binding:"required"`
	AutoUpdate     bool    `json:"autoUpdate"`
	UpdateInterval float64 `json:"updateInterval"`
}

type UpdateGitHubRepositoryRequest struct {
	RepoURL string `json:"repoUrl" binding:"required"`
	Force   bool   `json:"force"`
}

// InstallGitHubRepositoryHandler installs a plugin from GitHub repository
func InstallGitHubRepositoryHandler(c *gin.Context) {
	var req InstallGitHubRepositoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid GitHub install request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Installing GitHub repository",
		zap.String("repoUrl", req.RepoURL),
		zap.Bool("autoUpdate", req.AutoUpdate),
		zap.Float64("updateInterval", req.UpdateInterval))

	if err := pluginManager.LoadPluginFromGitHub(req.RepoURL); err != nil {
		logger.Error("Failed to install GitHub repository",
			zap.String("repoUrl", req.RepoURL),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to install GitHub repository",
			"details": err.Error(),
		})
		return
	}

	logger.Info("GitHub repository installed successfully", zap.String("repoUrl", req.RepoURL))
	c.JSON(http.StatusOK, gin.H{
		"message":        "GitHub repository installed successfully",
		"type":           "github",
		"repoUrl":        req.RepoURL,
		"autoUpdate":     req.AutoUpdate,
		"updateInterval": req.UpdateInterval,
	})
}

// UpdateGitHubRepositoryHandler forces update of a GitHub repository
func UpdateGitHubRepositoryHandler(c *gin.Context) {
	var req UpdateGitHubRepositoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Error("Invalid GitHub update request", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	logger.Info("Updating GitHub repository",
		zap.String("repoUrl", req.RepoURL),
		zap.Bool("force", req.Force))

	// Unload existing plugins before update
	plugins := pluginManager.ListPlugins()
	var unloadedPlugins []string

	for pluginID := range plugins {
		logger.Info("Unloading existing plugin for update", zap.String("pluginId", pluginID))
		if err := pluginManager.UnloadPlugin(pluginID); err != nil {
			logger.Warn("Could not unload plugin for update",
				zap.String("pluginId", pluginID),
				zap.Error(err))
		} else {
			unloadedPlugins = append(unloadedPlugins, pluginID)
		}
	}

	// Load fresh version from GitHub
	if err := pluginManager.LoadPluginFromGitHub(req.RepoURL); err != nil {
		logger.Error("Failed to update GitHub repository",
			zap.String("repoUrl", req.RepoURL),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update GitHub repository",
			"details": err.Error(),
		})
		return
	}

	logger.Info("GitHub repository updated successfully",
		zap.String("repoUrl", req.RepoURL),
		zap.Strings("unloadedPlugins", unloadedPlugins))

	c.JSON(http.StatusOK, gin.H{
		"message":         "GitHub repository updated successfully",
		"type":            "github",
		"repoUrl":         req.RepoURL,
		"unloadedPlugins": unloadedPlugins,
		"action":          "unload_and_reload",
	})
}
