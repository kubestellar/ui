package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/services"
)

var pluginService *services.EnhancedPluginService

// InitializePluginSystem initializes the enhanced plugin system
func InitializePluginSystem(router *gin.Engine) error {
	config := services.DefaultPluginServiceConfig()
	pluginService = services.NewEnhancedPluginService(router, config)
	return pluginService.Initialize()
}

// LoadPluginHandler handles requests to load a plugin
func LoadPluginHandler(c *gin.Context) {
	var req struct {
		Source  string `json:"source" binding:"required"`
		Version string `json:"version"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.Version == "" {
		req.Version = "latest"
	}

	if err := pluginService.LoadPlugin(req.Source, req.Version); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to load plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin loaded successfully from %s", req.Source),
		"source":  req.Source,
		"version": req.Version,
	})
}

// UnloadPluginHandler handles requests to unload a plugin
func UnloadPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	if err := pluginService.UnloadPlugin(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to unload plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin %s unloaded successfully", pluginID),
	})
}

// ReloadPluginHandler handles requests to reload a plugin
func ReloadPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	if err := pluginService.ReloadPlugin(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to reload plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin %s reloaded successfully", pluginID),
	})
}

// ListPluginsHandler returns all loaded plugins
func ListPluginsHandler(c *gin.Context) {
	plugins := pluginService.ListPlugins()

	var pluginList []gin.H
	for id, plugin := range plugins {
		metadata := plugin.Metadata
		status, _ := pluginService.GetPluginStatus(id)

		pluginList = append(pluginList, gin.H{
			"id":           id,
			"name":         metadata.Name,
			"version":      metadata.Version,
			"description":  metadata.Description,
			"author":       metadata.Author,
			"status":       status.State,
			"health":       status.Health,
			"loaded_at":    metadata.LoadedAt,
			"loaded_from":  metadata.LoadedFrom,
			"endpoints":    len(metadata.Endpoints),
			"permissions":  metadata.Permissions,
			"dependencies": metadata.Dependencies,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins": pluginList,
		"total":   len(pluginList),
	})
}

// GetPluginHandler returns detailed information about a specific plugin
func GetPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	plugin, exists := pluginService.GetPlugin(pluginID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	status, _ := pluginService.GetPluginStatus(pluginID)

	c.JSON(http.StatusOK, gin.H{
		"plugin": gin.H{
			"metadata": plugin.Metadata,
			"status":   status,
			"routes":   []string{},
		},
	})
}

// GetPluginStatusHandler returns the status of a specific plugin
func GetPluginStatusHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	status, exists := pluginService.GetPluginStatus(pluginID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"plugin_id": pluginID,
		"status":    status,
	})
}

// GetSystemMetricsHandler returns comprehensive system metrics
func GetSystemMetricsHandler(c *gin.Context) {
	metrics := pluginService.GetSystemMetrics()
	c.JSON(http.StatusOK, gin.H{
		"metrics": metrics,
	})
}

// ValidatePluginHandler validates a plugin without loading it
func ValidatePluginHandler(c *gin.Context) {
	var req struct {
		PluginPath   string `json:"plugin_path" binding:"required"`
		ManifestPath string `json:"manifest_path" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := pluginService.ValidatePlugin(req.PluginPath, req.ManifestPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"message": "Plugin validation successful",
	})
}

// GetAvailablePluginsHandler returns available plugins from registries
func GetAvailablePluginsHandler(c *gin.Context) {
	category := c.Query("category")
	query := c.Query("q")

	var plugins []map[string]interface{}
	if query != "" || category != "" {
		plugins = pluginService.SearchPlugins(query, category)
	} else {
		plugins = pluginService.GetAvailablePlugins()
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins":    plugins,
		"total":      len(plugins),
		"categories": pluginService.GetPluginCategories(),
	})
}

// GetHealthSummaryHandler returns health summary of all plugins
func GetHealthSummaryHandler(c *gin.Context) {
	summary := pluginService.GetHealthSummary()
	c.JSON(http.StatusOK, gin.H{
		"health_summary": summary,
	})
}

// UpdatePluginHandler updates a plugin to the latest version
func UpdatePluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	if err := pluginService.UpdatePlugin(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to update plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin %s updated successfully", pluginID),
	})
}

// EnablePluginHandler enables a disabled plugin
func EnablePluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	if err := pluginService.EnablePlugin(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to enable plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin %s enabled successfully", pluginID),
	})
}

// DisablePluginHandler disables an enabled plugin
func DisablePluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plugin ID is required"})
		return
	}

	if err := pluginService.DisablePlugin(pluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to disable plugin: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Plugin %s disabled successfully", pluginID),
	})
}

// ClearCacheHandler clears the plugin build cache
func ClearCacheHandler(c *gin.Context) {
	if err := pluginService.ClearCache(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to clear cache: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin cache cleared successfully",
	})
}

// GetCacheInfoHandler returns information about the plugin cache
func GetCacheInfoHandler(c *gin.Context) {
	cacheInfo := pluginService.GetCacheInfo()
	c.JSON(http.StatusOK, gin.H{
		"cache_info": cacheInfo,
	})
}

// GetConfigurationHandler returns the current plugin service configuration
func GetConfigurationHandler(c *gin.Context) {
	config := pluginService.GetConfiguration()
	c.JSON(http.StatusOK, gin.H{
		"configuration": gin.H{
			"plugin_dir":            config.PluginDir,
			"cache_dir":             config.CacheDir,
			"max_plugin_size":       config.MaxPluginSize,
			"security_mode":         config.SecurityMode,
			"health_checks_enabled": config.EnableHealthChecks,
			"auto_updates_enabled":  config.EnableAutoUpdates,
			"allowed_repos_count":   len(config.AllowedRepos),
			"auto_load_plugins":     config.AutoLoadPlugins,
		},
	})
}

// UpdateConfigurationHandler updates the plugin service configuration
func UpdateConfigurationHandler(c *gin.Context) {
	var req struct {
		PluginDir          string   `json:"plugin_dir"`
		CacheDir           string   `json:"cache_dir"`
		MaxPluginSize      int64    `json:"max_plugin_size"`
		SecurityMode       string   `json:"security_mode"`
		EnableHealthChecks bool     `json:"enable_health_checks"`
		EnableAutoUpdates  bool     `json:"enable_auto_updates"`
		AllowedRepos       []string `json:"allowed_repos"`
		AutoLoadPlugins    []string `json:"auto_load_plugins"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	config := pluginService.GetConfiguration()

	// Update non-empty values
	if req.PluginDir != "" {
		config.PluginDir = req.PluginDir
	}
	if req.CacheDir != "" {
		config.CacheDir = req.CacheDir
	}
	if req.MaxPluginSize > 0 {
		config.MaxPluginSize = req.MaxPluginSize
	}
	if req.SecurityMode != "" {
		if !contains([]string{"strict", "normal", "permissive"}, req.SecurityMode) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid security mode"})
			return
		}
		config.SecurityMode = req.SecurityMode
	}
	if req.AllowedRepos != nil {
		config.AllowedRepos = req.AllowedRepos
	}
	if req.AutoLoadPlugins != nil {
		config.AutoLoadPlugins = req.AutoLoadPlugins
	}

	config.EnableHealthChecks = req.EnableHealthChecks
	config.EnableAutoUpdates = req.EnableAutoUpdates

	if err := pluginService.UpdateConfiguration(config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to update configuration: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Configuration updated successfully",
	})
}

// Utility function
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if strings.EqualFold(s, item) {
			return true
		}
	}
	return false
}

// GetPluginService returns the global plugin service instance
func GetPluginService() *services.EnhancedPluginService {
	return pluginService
}
