package api

import (
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	"github.com/kubestellar/ui/plugin/plugins"
	"go.uber.org/zap"
)

// In-memory storage for plugin system state
var (
	// Map to store disabled plugin instances so they can be re-enabled
	disabledPlugins      = make(map[string]plugin.Plugin)
	disabledPluginsMutex = sync.RWMutex{}

	// Plugin system configuration
	systemConfig = PluginSystemConfig{
		PluginsDirectory:   "/plugins",
		AutoloadPlugins:    true,
		PluginTimeout:      30,
		MaxConcurrentCalls: 10,
		LogLevel:           "info",
	}
	systemConfigMutex = sync.RWMutex{}

	// Plugin feedback storage
	pluginFeedbacks = make([]PluginFeedback, 0)
	feedbackMutex   = sync.RWMutex{}
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

	pluginsList := []PluginDetails{}

	// Get enabled plugins from plugin manager
	enabledPlugins := getRegisteredPlugins()
	for _, p := range enabledPlugins {
		pluginsList = append(pluginsList, PluginDetails{
			ID:      p.Name(),
			Name:    p.Name(),
			Version: p.Version(),
			Enabled: true,
			Status:  "active",
			Routes:  extractPluginRoutes(p),
		})
	}

	// Get disabled plugins from storage
	disabledPluginsMutex.RLock()
	for _, p := range disabledPlugins {
		pluginsList = append(pluginsList, PluginDetails{
			ID:      p.Name(),
			Name:    p.Name(),
			Version: p.Version(),
			Enabled: false,
			Status:  "inactive",
			Routes:  extractPluginRoutes(p),
		})
	}
	disabledPluginsMutex.RUnlock()

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

	// Check enabled plugins first
	plugin := findPluginByID(pluginID)
	if plugin != nil {
		details := PluginDetails{
			ID:      plugin.Name(),
			Name:    plugin.Name(),
			Version: plugin.Version(),
			Enabled: true,
			Status:  "active",
			Routes:  extractPluginRoutes(plugin),
		}
		c.JSON(http.StatusOK, details)
		return
	}

	// Check disabled plugins
	disabledPluginsMutex.RLock()
	disabledPlugin, exists := disabledPlugins[pluginID]
	disabledPluginsMutex.RUnlock()

	if exists {
		details := PluginDetails{
			ID:      disabledPlugin.Name(),
			Name:    disabledPlugin.Name(),
			Version: disabledPlugin.Version(),
			Enabled: false,
			Status:  "inactive",
			Routes:  extractPluginRoutes(disabledPlugin),
		}
		c.JSON(http.StatusOK, details)
		return
	}

	c.JSON(http.StatusNotFound, gin.H{
		"error": "Plugin not found",
	})
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

	// Check if plugin exists (enabled or disabled)
	plugin := findPluginByID(pluginID)
	var found bool = plugin != nil

	if !found {
		disabledPluginsMutex.RLock()
		_, found = disabledPlugins[pluginID]
		disabledPluginsMutex.RUnlock()
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// If plugin is currently enabled, deregister it
	if plugin != nil {
		plugins.Pm.Deregister(plugin)
		log.LogInfo("Deregistered plugin from manager", zap.String("id", pluginID))
	}

	// Remove from disabled plugins storage if it exists there
	disabledPluginsMutex.Lock()
	delete(disabledPlugins, pluginID)
	disabledPluginsMutex.Unlock()

	log.LogInfo("Plugin uninstalled successfully", zap.String("id", pluginID))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin uninstalled successfully",
		"id":      pluginID,
		"status":  "uninstalled",
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
			"error": "Plugin not found or not enabled",
		})
		return
	}

	// Deregister and re-register the plugin to simulate reload
	plugins.Pm.Deregister(plugin)
	plugins.Pm.Register(plugin)

	log.LogInfo("Plugin reloaded successfully", zap.String("id", pluginID))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin reloaded successfully",
		"id":      pluginID,
		"status":  "active",
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

	// Check if plugin is already enabled
	plugin := findPluginByID(pluginID)
	if plugin != nil {
		c.JSON(http.StatusOK, gin.H{
			"message": "Plugin is already enabled",
			"id":      pluginID,
			"status":  "enabled",
		})
		return
	}

	// Check if plugin exists in disabled storage
	disabledPluginsMutex.Lock()
	disabledPlugin, exists := disabledPlugins[pluginID]
	if !exists {
		disabledPluginsMutex.Unlock()
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// Move plugin from disabled to enabled
	delete(disabledPlugins, pluginID)
	disabledPluginsMutex.Unlock()

	// Register with plugin manager
	plugins.Pm.Register(disabledPlugin)

	log.LogInfo("Plugin enabled successfully", zap.String("id", pluginID))

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
		// Check if already disabled
		disabledPluginsMutex.RLock()
		_, exists := disabledPlugins[pluginID]
		disabledPluginsMutex.RUnlock()

		if exists {
			c.JSON(http.StatusOK, gin.H{
				"message": "Plugin is already disabled",
				"id":      pluginID,
				"status":  "disabled",
			})
			return
		}

		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// Move plugin from enabled to disabled
	plugins.Pm.Deregister(plugin)

	disabledPluginsMutex.Lock()
	disabledPlugins[pluginID] = plugin
	disabledPluginsMutex.Unlock()

	log.LogInfo("Plugin disabled successfully", zap.String("id", pluginID))

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

	// Check enabled plugins first
	plugin := findPluginByID(pluginID)
	if plugin != nil {
		status := gin.H{
			"id":      pluginID,
			"name":    plugin.Name(),
			"version": plugin.Version(),
			"enabled": true,
			"status":  "active",
			"routes":  extractPluginRoutes(plugin),
		}
		c.JSON(http.StatusOK, status)
		return
	}

	// Check disabled plugins
	disabledPluginsMutex.RLock()
	disabledPlugin, exists := disabledPlugins[pluginID]
	disabledPluginsMutex.RUnlock()

	if exists {
		status := gin.H{
			"id":      pluginID,
			"name":    disabledPlugin.Name(),
			"version": disabledPlugin.Version(),
			"enabled": false,
			"status":  "inactive",
			"routes":  extractPluginRoutes(disabledPlugin),
		}
		c.JSON(http.StatusOK, status)
		return
	}

	c.JSON(http.StatusNotFound, gin.H{
		"error": "Plugin not found",
	})
}

// GetPluginSystemMetricsHandler returns system-wide metrics for plugins
func GetPluginSystemMetricsHandler(c *gin.Context) {
	enabledPlugins := getRegisteredPlugins()

	disabledPluginsMutex.RLock()
	disabledCount := len(disabledPlugins)
	disabledPluginsMutex.RUnlock()

	// Get system metrics
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	systemConfigMutex.RLock()
	pluginsDir := systemConfig.PluginsDirectory
	systemConfigMutex.RUnlock()

	metrics := PluginSystemMetrics{
		TotalPlugins:     len(enabledPlugins) + disabledCount,
		EnabledPlugins:   len(enabledPlugins),
		DisabledPlugins:  disabledCount,
		SystemLoad:       0.0, // Could be implemented with system calls
		MemoryUsage:      fmt.Sprintf("%.2f MB", float64(m.Alloc)/1024/1024),
		LastUpdated:      time.Now(),
		PluginsDirectory: pluginsDir,
	}

	c.JSON(http.StatusOK, metrics)
}

// GetPluginSystemConfigHandler returns the configuration for the plugin system
func GetPluginSystemConfigHandler(c *gin.Context) {
	systemConfigMutex.RLock()
	config := systemConfig
	systemConfigMutex.RUnlock()

	c.JSON(http.StatusOK, config)
}

// UpdatePluginSystemConfigHandler updates the configuration for the plugin system
func UpdatePluginSystemConfigHandler(c *gin.Context) {
	var newConfig PluginSystemConfig

	if err := c.ShouldBindJSON(&newConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid configuration: " + err.Error(),
		})
		return
	}

	// Validate configuration
	if newConfig.PluginTimeout <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin timeout must be greater than 0",
		})
		return
	}

	if newConfig.MaxConcurrentCalls <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Max concurrent calls must be greater than 0",
		})
		return
	}

	// Update configuration
	systemConfigMutex.Lock()
	systemConfig = newConfig
	systemConfigMutex.Unlock()

	log.LogInfo("Plugin system configuration updated successfully",
		zap.String("pluginsDirectory", newConfig.PluginsDirectory),
		zap.Bool("autoloadPlugins", newConfig.AutoloadPlugins),
		zap.Int("pluginTimeout", newConfig.PluginTimeout))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin system configuration updated successfully",
		"config":  newConfig,
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

	// Check if the plugin exists (enabled or disabled)
	plugin := findPluginByID(feedback.PluginID)
	var found bool = plugin != nil

	if !found {
		disabledPluginsMutex.RLock()
		_, found = disabledPlugins[feedback.PluginID]
		disabledPluginsMutex.RUnlock()
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
		})
		return
	}

	// Set creation time
	feedback.CreatedAt = time.Now()

	// Store feedback
	feedbackMutex.Lock()
	pluginFeedbacks = append(pluginFeedbacks, feedback)
	feedbackMutex.Unlock()

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

// Helper functions

// getRegisteredPlugins returns all registered plugins
func getRegisteredPlugins() []plugin.Plugin {
	result := []plugin.Plugin{}

	// Get all plugins from the plugin manager
	for _, p := range plugins.Pm.GetPlugins() {
		result = append(result, p)
	}

	return result
}

// findPluginByID finds a plugin by its ID in the enabled plugins
func findPluginByID(id string) plugin.Plugin {
	for _, p := range getRegisteredPlugins() {
		if p.Name() == id {
			return p
		}
	}
	return nil
}

// getPluginStatus returns the status of a plugin (this is now simplified since we manage enabled/disabled state)
func getPluginStatus(p plugin.Plugin) string {
	return "active" // If plugin is registered, it's active
}

// extractPluginRoutes extracts the routes of a plugin
func extractPluginRoutes(p plugin.Plugin) []string {
	routes := []string{}

	for _, route := range p.Routes() {
		routes = append(routes, route.Method+" "+route.Path)
	}

	return routes
}
