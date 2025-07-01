package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	pkg "github.com/kubestellar/ui/pkg/plugins"
	"github.com/kubestellar/ui/plugin"
	"github.com/kubestellar/ui/plugin/plugins"
	"go.uber.org/zap"
)

// PluginDetails represents the detailed information of a plugin
type PluginDetails struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Version     string    `json:"version"`
	Enabled     bool      `json:"enabled"`
	Description string    `json:"description,omitempty"`
	Author      string    `json:"author,omitempty"`
	CreatedAt   time.Time `json:"createdAt,omitempty"`
	UpdatedAt   time.Time `json:"updatedAt,omitempty"`
	Routes      []string  `json:"routes,omitempty"`
	Status      string    `json:"status"`
}

// PluginSystemMetrics contains system-wide metrics for plugins
type PluginSystemMetrics struct {
	TotalPlugins     int       `json:"totalPlugins"`
	EnabledPlugins   int       `json:"enabledPlugins"`
	DisabledPlugins  int       `json:"disabledPlugins"`
	SystemLoad       float64   `json:"systemLoad,omitempty"`
	MemoryUsage      string    `json:"memoryUsage,omitempty"`
	LastUpdated      time.Time `json:"lastUpdated"`
	PluginsDirectory string    `json:"pluginsDirectory"`
}

// PluginSystemConfig represents the configuration for the plugin system
type PluginSystemConfig struct {
	PluginsDirectory   string `json:"pluginsDirectory"`
	AutoloadPlugins    bool   `json:"autoloadPlugins"`
	PluginTimeout      int    `json:"pluginTimeout"`
	MaxConcurrentCalls int    `json:"maxConcurrentCalls"`
	LogLevel           string `json:"logLevel"`
}

// PluginFeedback represents user feedback for a plugin
type PluginFeedback struct {
	PluginID  string    `json:"pluginId" binding:"required"`
	Rating    float32   `json:"rating" binding:"required,min=0,max=5"`
	Comments  string    `json:"comments"`
	UserID    string    `json:"userId,omitempty"`
	UserEmail string    `json:"userEmail,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// ListPluginsHandler returns a list of all available plugins
func ListPluginsHandler(c *gin.Context) {
	log.LogInfo("Handling ListPluginsHandler request")

	// Currently, we'll retrieve plugins from the PluginManager
	pluginsList := []PluginDetails{}

	// Get all registered plugins from the plugin manager
	for _, p := range getRegisteredPlugins() {
		pluginsList = append(pluginsList, PluginDetails{
			ID:      p.Name(),
			Name:    p.Name(),
			Version: p.Version(),
			Enabled: p.Enabled() == 1,
			Status:  getPluginStatus(p),
			Routes:  extractPluginRoutes(p),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins": pluginsList,
		"count":   len(pluginsList),
	})
}

// GetPluginDetailsHandler returns details about a specific plugin
func GetPluginDetailsHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	details := PluginDetails{
		ID:      plugin.Name(),
		Name:    plugin.Name(),
		Version: plugin.Version(),
		Enabled: plugin.Enabled() == 1,
		Status:  getPluginStatus(plugin),
		Routes:  extractPluginRoutes(plugin),
	}

	c.JSON(http.StatusOK, details)
}

// InstallPluginHandler installs a new plugin
func InstallPluginHandler(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required"`
		Version string `json:"version"`
		Source  string `json:"source" binding:"required"` // URL or local path
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// For now, we'll simulate the installation process
	// In a real implementation, you would:
	// 1. Download/copy the plugin from the source
	// 2. Verify its integrity
	// 3. Install it to the plugins directory
	// 4. Register it with the plugin manager

	log.LogInfo("Plugin installation requested",
		zap.String("name", req.Name),
		zap.String("version", req.Version),
		zap.String("source", req.Source))

	// Simulate installation failure if the plugin already exists
	if findPluginByID(req.Name) != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Plugin already installed",
		})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Plugin installation initiated",
		"name":    req.Name,
		"status":  "installing",
		"details": "This is a simulated response. In a real implementation, the plugin would be installed asynchronously.",
	})
}

// UninstallPluginHandler uninstalls a plugin
func UninstallPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// For now, we'll simulate the uninstallation process
	// In a real implementation, you would:
	// 1. Deregister the plugin from the plugin manager
	// 2. Stop any running processes
	// 3. Remove the plugin files

	log.LogInfo("Plugin uninstallation requested", zap.String("id", pluginID))

	c.JSON(http.StatusAccepted, gin.H{
		"message": "Plugin uninstallation initiated",
		"id":      pluginID,
		"status":  "uninstalling",
	})
}

// ReloadPluginHandler reloads a plugin
func ReloadPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// For now, we'll simulate the reload process
	// In a real implementation, you would:
	// 1. Deregister the plugin from the plugin manager
	// 2. Reload the plugin code
	// 3. Register it again with the plugin manager

	log.LogInfo("Plugin reload requested", zap.String("id", pluginID))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin reloaded successfully",
		"id":      pluginID,
	})
}

// EnablePluginHandler enables a plugin
func EnablePluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// If the plugin is already enabled, return success
	if plugin.Enabled() == 1 {
		c.JSON(http.StatusOK, gin.H{
			"message": "Plugin is already enabled",
			"id":      pluginID,
			"status":  "enabled",
		})
		return
	}

	// For now, we'll simulate enabling the plugin
	// In a real implementation, you would:
	// 1. Update the plugin's enabled status
	// 2. Start any necessary processes

	log.LogInfo("Plugin enable requested", zap.String("id", pluginID))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin enabled successfully",
		"id":      pluginID,
		"status":  "enabled",
	})
}

// DisablePluginHandler disables a plugin
func DisablePluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// If the plugin is already disabled, return success
	if plugin.Enabled() == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message": "Plugin is already disabled",
			"id":      pluginID,
			"status":  "disabled",
		})
		return
	}

	// For now, we'll simulate disabling the plugin
	// In a real implementation, you would:
	// 1. Update the plugin's enabled status
	// 2. Stop any running processes

	log.LogInfo("Plugin disable requested", zap.String("id", pluginID))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin disabled successfully",
		"id":      pluginID,
		"status":  "disabled",
	})
}

// GetPluginStatusHandler returns the status of a plugin
func GetPluginStatusHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	status := gin.H{
		"id":      pluginID,
		"name":    plugin.Name(),
		"version": plugin.Version(),
		"enabled": plugin.Enabled() == 1,
		"status":  getPluginStatus(plugin),
		"routes":  extractPluginRoutes(plugin),
	}

	c.JSON(http.StatusOK, status)
}

// GetPluginSystemMetricsHandler returns system-wide metrics for plugins
func GetPluginSystemMetricsHandler(c *gin.Context) {
	plugins := getRegisteredPlugins()

	enabledCount := 0
	for _, p := range plugins {
		if p.Enabled() == 1 {
			enabledCount++
		}
	}

	metrics := PluginSystemMetrics{
		TotalPlugins:     len(plugins),
		EnabledPlugins:   enabledCount,
		DisabledPlugins:  len(plugins) - enabledCount,
		LastUpdated:      time.Now(),
		PluginsDirectory: "/plugins", // This would be configurable in a real implementation
	}

	c.JSON(http.StatusOK, metrics)
}

// GetPluginSystemConfigHandler returns the configuration for the plugin system
func GetPluginSystemConfigHandler(c *gin.Context) {
	// In a real implementation, this would be loaded from a configuration file or database
	config := PluginSystemConfig{
		PluginsDirectory:   "/plugins",
		AutoloadPlugins:    true,
		PluginTimeout:      30,
		MaxConcurrentCalls: 10,
		LogLevel:           "info",
	}

	c.JSON(http.StatusOK, config)
}

// UpdatePluginSystemConfigHandler updates the configuration for the plugin system
func UpdatePluginSystemConfigHandler(c *gin.Context) {
	var config PluginSystemConfig

	if err := c.ShouldBindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid configuration: " + err.Error(),
		})
		return
	}

	// In a real implementation, this would save the configuration to a file or database
	log.LogInfo("Plugin system configuration update requested",
		zap.String("pluginsDirectory", config.PluginsDirectory),
		zap.Bool("autoloadPlugins", config.AutoloadPlugins),
		zap.Int("pluginTimeout", config.PluginTimeout))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin system configuration updated successfully",
		"config":  config,
	})
}

// SubmitPluginFeedbackHandler handles feedback submission for plugins
func SubmitPluginFeedbackHandler(c *gin.Context) {
	var feedback PluginFeedback

	if err := c.ShouldBindJSON(&feedback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid feedback data: " + err.Error(),
		})
		return
	}

	// Check if the plugin exists
	plugin := findPluginByID(feedback.PluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// Set creation time
	feedback.CreatedAt = time.Now()

	// In a real implementation, you would:
	// 1. Store the feedback in a database
	// 2. Update plugin ratings
	// 3. Notify plugin maintainers

	log.LogInfo("Plugin feedback submitted",
		zap.String("pluginId", feedback.PluginID),
		zap.Float32("rating", feedback.Rating))

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Feedback submitted successfully",
		"pluginId": feedback.PluginID,
		"rating":   feedback.Rating,
		"received": feedback.CreatedAt,
	})
}

// GetAllPluginManifestsHandler returns all plugin manifests
func GetAllPluginManifestsHandler(c *gin.Context) {
	// Get the plugin manager instance
	pm := pkg.NewPluginManager(gin.Default()) // Pass a *gin.Engine as required

	// Get all plugins
	pluginList := pm.GetPluginList()

	// Extract manifests
	manifests := make([]pkg.PluginManifest, 0, len(pluginList))
	for _, plugin := range pluginList {
		manifests = append(manifests, *plugin.Manifest)
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   manifests,
	})
}

// Helper functions

// getRegisteredPlugins returns all registered plugins
func getRegisteredPlugins() []plugin.Plugin {
	result := []plugin.Plugin{}

	// For demonstration purposes, we'll return all plugins from the plugin manager
	// This is a simplified approach; a real implementation would have more sophisticated
	// plugin management

	// Access the plugins field of the PluginManager (assuming it's accessible)
	// This is a placeholder; you would need to implement actual access to the plugin manager
	for _, p := range plugins.Pm.GetPlugins() {
		result = append(result, p)
	}

	return result
}

// findPluginByID finds a plugin by its ID
func findPluginByID(id string) plugin.Plugin {
	for _, p := range getRegisteredPlugins() {
		if p.Name() == id {
			return p
		}
	}
	return nil
}

// getPluginStatus returns the status of a plugin
func getPluginStatus(p plugin.Plugin) string {
	if p.Enabled() == 1 {
		return "active"
	}
	return "inactive"
}

// extractPluginRoutes extracts the routes of a plugin
func extractPluginRoutes(p plugin.Plugin) []string {
	routes := []string{}

	for _, route := range p.Routes() {
		routes = append(routes, route.Method+" "+route.Path)
	}

	return routes
}
