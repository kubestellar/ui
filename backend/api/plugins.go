package api

import (
	"archive/tar"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	pkg "github.com/kubestellar/ui/backend/pkg/plugins"
	"github.com/kubestellar/ui/backend/plugin"
	"github.com/kubestellar/ui/backend/plugin/plugins"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

// Global plugin manager and registry for dynamic plugin loading
var (
	GlobalPluginManager  *pkg.PluginManager
	GlobalPluginRegistry *pkg.PluginRegistry
	pluginManagerMutex   sync.RWMutex
)

// SetGlobalPluginManager sets the global plugin manager and registry
func SetGlobalPluginManager(manager *pkg.PluginManager, registry *pkg.PluginRegistry) {
	pluginManagerMutex.Lock()
	defer pluginManagerMutex.Unlock()
	GlobalPluginManager = manager
	GlobalPluginRegistry = registry
}

// GetGlobalPluginManager returns the global plugin manager
func GetGlobalPluginManager() *pkg.PluginManager {
	pluginManagerMutex.RLock()
	defer pluginManagerMutex.RUnlock()
	return GlobalPluginManager
}

// GetGlobalPluginRegistry returns the global plugin registry
func GetGlobalPluginRegistry() *pkg.PluginRegistry {
	pluginManagerMutex.RLock()
	defer pluginManagerMutex.RUnlock()
	return GlobalPluginRegistry
}

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

	// Get plugins from the global plugin manager
	pluginManager := GetGlobalPluginManager()
	pluginRegistry := GetGlobalPluginRegistry()

	if pluginManager != nil && pluginRegistry != nil {
		// Get all loaded plugins from the manager
		loadedPlugins := pluginManager.GetPluginList()

		// Convert to API response format
		for _, p := range loadedPlugins {
			if p.Manifest != nil {
				pluginsList = append(pluginsList, PluginDetails{
					ID:          p.Manifest.Metadata.Name,
					Name:        p.Manifest.Metadata.Name,
					Version:     p.Manifest.Metadata.Version,
					Enabled:     p.Status == "running",
					Description: p.Manifest.Metadata.Description,
					Author:      p.Manifest.Metadata.Author,
					CreatedAt:   p.LoadTime,
					UpdatedAt:   p.LoadTime,
					Routes:      extractPluginRoutesFromManifest(p.Manifest),
					Status:      p.Status,
				})
			}
		}
	} else {
		// Fallback to old method if global manager not available
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
	// Handle multipart form data for file upload
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file uploaded or invalid file: " + err.Error(),
		})
		return
	}

	// Validate file type
	if !strings.HasSuffix(file.Filename, ".tar.gz") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid file type. Please upload a .tar.gz file",
		})
		return
	}

	// Create temporary directory for extraction
	tempDir, err := os.MkdirTemp("", "plugin_install_*")
	if err != nil {
		log.LogError("Failed to create temp directory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create temporary directory",
		})
		return
	}
	defer os.RemoveAll(tempDir) // Clean up temp directory

	// Save uploaded file to temp directory
	tempFile := filepath.Join(tempDir, file.Filename)
	if err := c.SaveUploadedFile(file, tempFile); err != nil {
		log.LogError("Failed to save uploaded file", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save uploaded file",
		})
		return
	}

	// Extract the tar.gz file
	extractDir := filepath.Join(tempDir, "extracted")
	if err := os.MkdirAll(extractDir, 0755); err != nil {
		log.LogError("Failed to create extract directory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create extract directory",
		})
		return
	}

	// Extract tar.gz file
	if err := extractTarGz(tempFile, extractDir); err != nil {
		log.LogError("Failed to extract plugin archive", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to extract plugin archive: " + err.Error(),
		})
		return
	}

	// Find plugin.yml in extracted directory
	manifestPath := filepath.Join(extractDir, "plugin.yml")
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "plugin.yml not found in uploaded archive",
		})
		return
	}

	// Parse plugin manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		log.LogError("Failed to read plugin manifest", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read plugin manifest",
		})
		return
	}

	var manifest pkg.PluginManifest
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		log.LogError("Failed to parse plugin manifest", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid plugin manifest format: " + err.Error(),
		})
		return
	}

	// Check if plugin already exists
	if findPluginByID(manifest.Metadata.Name) != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Plugin already installed: " + manifest.Metadata.Name,
		})
		return
	}

	// Find WASM file
	// Determine WASM file name
	wasmFileName := manifest.Metadata.Name + ".wasm"
	if manifest.Spec.Wasm != nil && manifest.Spec.Wasm.File != "" {
		wasmFileName = manifest.Spec.Wasm.File
	}
	wasmPath := filepath.Join(extractDir, wasmFileName)
	if _, err := os.Stat(wasmPath); os.IsNotExist(err) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "WASM file not found: " + wasmFileName,
		})
		return
	}

	// Create plugin directory in plugins folder
	pluginDir := filepath.Join("./plugins", manifest.Metadata.Name)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		log.LogError("Failed to create plugin directory", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create plugin directory",
		})
		return
	}

	// Copy files to plugin directory
	if err := copyFile(manifestPath, filepath.Join(pluginDir, "plugin.yml")); err != nil {
		log.LogError("Failed to copy plugin manifest", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to copy plugin manifest",
		})
		return
	}

	if err := copyFile(wasmPath, filepath.Join(pluginDir, wasmFileName)); err != nil {
		log.LogError("Failed to copy WASM file", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to copy WASM file",
		})
		return
	}

	// Copy frontend directory if it exists
	frontendSrc := filepath.Join(extractDir, "frontend")
	frontendDest := filepath.Join(pluginDir, "frontend")
	if _, err := os.Stat(frontendSrc); err == nil {
		if err := copyDir(frontendSrc, frontendDest); err != nil {
			log.LogError("Failed to copy frontend directory", zap.Error(err))
			// Don't fail the installation for frontend copy errors
		}
	}

	// Load the plugin dynamically using the global plugin manager
	pluginManager := GetGlobalPluginManager()
	pluginRegistry := GetGlobalPluginRegistry()

	if pluginManager != nil && pluginRegistry != nil {
		// Load the plugin
		if err := pluginRegistry.LoadPlugin(manifest.Metadata.Name); err != nil {
			log.LogError("Failed to load plugin after installation",
				zap.String("name", manifest.Metadata.Name),
				zap.Error(err))

			// Return success for installation but warn about loading failure
			c.JSON(http.StatusOK, gin.H{
				"message": "Plugin installed successfully but failed to load",
				"name":    manifest.Metadata.Name,
				"version": manifest.Metadata.Version,
				"status":  "installed",
				"path":    pluginDir,
				"warning": "Plugin loaded with errors: " + err.Error(),
			})
			return
		}

		log.LogInfo("Plugin installed and loaded successfully",
			zap.String("name", manifest.Metadata.Name),
			zap.String("version", manifest.Metadata.Version),
			zap.String("path", pluginDir))
	} else {
		log.LogWarn("Plugin manager not available for dynamic loading",
			zap.String("name", manifest.Metadata.Name))
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin installed and loaded successfully",
		"name":    manifest.Metadata.Name,
		"version": manifest.Metadata.Version,
		"status":  "loaded",
		"path":    pluginDir,
	})
}

// UninstallPluginHandler uninstalls a plugin completely from the system
func UninstallPluginHandler(c *gin.Context) {
	pluginID := c.Param("id")
	if pluginID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Plugin ID is required",
		})
		return
	}

	log.LogInfo("Starting plugin uninstallation", zap.String("id", pluginID))

	// Get global plugin manager and registry
	pluginManager := GetGlobalPluginManager()
	pluginRegistry := GetGlobalPluginRegistry()

	var uninstallErrors []string
	var successMessages []string

	// Step 1: Handle new WASM-based plugin system
	if pluginManager != nil && pluginRegistry != nil {
		log.LogInfo("Processing WASM plugin uninstallation", zap.String("id", pluginID))

		// Check if plugin exists in the WASM manager
		if plugin, exists := pluginManager.GetPlugin(pluginID); exists {
			log.LogInfo("Found WASM plugin, unloading", zap.String("id", pluginID))

			// Log plugin details before unloading
			if plugin.Manifest != nil {
				log.LogInfo("Plugin manifest details",
					zap.String("id", pluginID),
					zap.String("version", plugin.Manifest.Metadata.Version),
					zap.String("author", plugin.Manifest.Metadata.Author),
					zap.String("description", plugin.Manifest.Metadata.Description))
			}

			// Get registered routes before unloading
			registeredRoutes := pluginManager.GetRegisteredRoutes(pluginID)
			if len(registeredRoutes) > 0 {
				successMessages = append(successMessages, fmt.Sprintf("Found %d registered routes", len(registeredRoutes)))
				log.LogInfo("Found registered routes", zap.String("id", pluginID), zap.Strings("routes", registeredRoutes))
			}

			// Unload the plugin from the manager (this closes WASM instance and removes routes)
			if err := pluginManager.UnloadPlugin(pluginID); err != nil {
				uninstallErrors = append(uninstallErrors, fmt.Sprintf("Failed to unload WASM plugin: %v", err))
				log.LogError("Failed to unload WASM plugin", zap.String("id", pluginID), zap.Error(err))
			} else {
				successMessages = append(successMessages, "WASM plugin unloaded successfully")
				if len(registeredRoutes) > 0 {
					successMessages = append(successMessages, "Plugin routes removed from router")
				}
				log.LogInfo("WASM plugin unloaded successfully", zap.String("id", pluginID))
			}
		}
	}

	// Step 2: Handle old plugin system
	oldPlugin := findPluginByID(pluginID)
	if oldPlugin != nil {
		log.LogInfo("Found old plugin, deregistering", zap.String("id", pluginID))

		// Deregister from old plugin manager
		plugins.Pm.Deregister(oldPlugin)
		successMessages = append(successMessages, "Old plugin deregistered successfully")
		log.LogInfo("Old plugin deregistered successfully", zap.String("id", pluginID))
	}

	// Step 3: Remove from disabled plugins storage
	disabledPluginsMutex.Lock()
	if _, exists := disabledPlugins[pluginID]; exists {
		delete(disabledPlugins, pluginID)
		successMessages = append(successMessages, "Removed from disabled plugins")
		log.LogInfo("Removed from disabled plugins", zap.String("id", pluginID))
	}
	disabledPluginsMutex.Unlock()

	// Step 4: Remove plugin files from filesystem
	pluginDir := filepath.Join("./plugins", pluginID)
	if _, err := os.Stat(pluginDir); err == nil {
		log.LogInfo("Removing plugin directory", zap.String("path", pluginDir))

		// Remove the entire plugin directory
		if err := os.RemoveAll(pluginDir); err != nil {
			uninstallErrors = append(uninstallErrors, fmt.Sprintf("Failed to remove plugin directory: %v", err))
			log.LogError("Failed to remove plugin directory", zap.String("path", pluginDir), zap.Error(err))
		} else {
			successMessages = append(successMessages, "Plugin files removed from filesystem")
			log.LogInfo("Plugin directory removed successfully", zap.String("path", pluginDir))
		}
	} else {
		log.LogInfo("Plugin directory not found, skipping file removal", zap.String("path", pluginDir))
	}

	// Step 5: Remove routes from Gin router
	// Routes are automatically removed when the plugin is unloaded from the manager
	// The route tracking system ensures routes are properly cleaned up
	log.LogInfo("Plugin routes have been removed from router", zap.String("id", pluginID))

	// Prepare response
	if len(uninstallErrors) > 0 {
		// Partial success or failure
		c.JSON(http.StatusPartialContent, gin.H{
			"message": "Plugin uninstallation completed with errors",
			"id":      pluginID,
			"status":  "partially_uninstalled",
			"success": successMessages,
			"errors":  uninstallErrors,
		})
		log.LogWarn("Plugin uninstallation completed with errors",
			zap.String("id", pluginID),
			zap.Strings("errors", uninstallErrors))
	} else {
		// Complete success
		c.JSON(http.StatusOK, gin.H{
			"message": "Plugin uninstalled successfully",
			"id":      pluginID,
			"status":  "uninstalled",
			"success": successMessages,
		})
		log.LogInfo("Plugin uninstalled successfully",
			zap.String("id", pluginID),
			zap.Strings("success", successMessages))
	}
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

// GetAllPluginManifestsHandler returns all plugin manifests
func GetAllPluginManifestsHandler(c *gin.Context) {
	// Get the plugin manager instance
	pm := pkg.NewPluginManager(&gin.Engine{})

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

// SearchPluginsHandler provides advanced search with filtering, sorting, and pagination for plugins
func SearchPluginsHandler(c *gin.Context) {
	// Query parameters
	name := c.Query("name")
	enabled := c.Query("enabled")               // "true" or "false" or empty
	sortBy := c.DefaultQuery("sort_by", "name") // name, createdAt, updatedAt
	order := c.DefaultQuery("order", "asc")     // asc or desc
	limitStr := c.DefaultQuery("limit", "20")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 20
	}
	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Get all plugins (same as ListPluginsHandler)
	pluginsList := []PluginDetails{}
	pluginManager := GetGlobalPluginManager()
	pluginRegistry := GetGlobalPluginRegistry()

	if pluginManager != nil && pluginRegistry != nil {
		loadedPlugins := pluginManager.GetPluginList()
		for _, p := range loadedPlugins {
			if p.Manifest != nil {
				pluginsList = append(pluginsList, PluginDetails{
					ID:          p.Manifest.Metadata.Name,
					Name:        p.Manifest.Metadata.Name,
					Version:     p.Manifest.Metadata.Version,
					Enabled:     p.Status == "running",
					Description: p.Manifest.Metadata.Description,
					Author:      p.Manifest.Metadata.Author,
					CreatedAt:   p.LoadTime,
					UpdatedAt:   p.LoadTime,
					Routes:      extractPluginRoutesFromManifest(p.Manifest),
					Status:      p.Status,
				})
			}
		}
	} else {
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
	}

	// Filtering
	filtered := make([]PluginDetails, 0, len(pluginsList))
	for _, p := range pluginsList {
		if name != "" && !strings.Contains(strings.ToLower(p.Name), strings.ToLower(name)) {
			continue
		}
		if enabled != "" {
			wantEnabled := enabled == "true"
			if p.Enabled != wantEnabled {
				continue
			}
		}
		filtered = append(filtered, p)
	}

	// Sorting
	switch sortBy {
	case "name":
		sort.Slice(filtered, func(i, j int) bool {
			if order == "desc" {
				return filtered[i].Name > filtered[j].Name
			}
			return filtered[i].Name < filtered[j].Name
		})
	case "createdAt":
		sort.Slice(filtered, func(i, j int) bool {
			if order == "desc" {
				return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
			}
			return filtered[i].CreatedAt.Before(filtered[j].CreatedAt)
		})
	case "updatedAt":
		sort.Slice(filtered, func(i, j int) bool {
			if order == "desc" {
				return filtered[i].UpdatedAt.After(filtered[j].UpdatedAt)
			}
			return filtered[i].UpdatedAt.Before(filtered[j].UpdatedAt)
		})
	}

	total := len(filtered)
	// Pagination
	start := offset
	if start > total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	paginated := filtered[start:end]

	c.JSON(http.StatusOK, gin.H{
		"plugins": paginated,
		"count":   len(paginated),
		"total":   total,
		"limit":   limit,
		"offset":  offset,
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

// extractPluginRoutesFromManifest extracts routes from a plugin manifest
func extractPluginRoutesFromManifest(manifest *pkg.PluginManifest) []string {
	routes := []string{}

	if manifest.Spec.Backend != nil {
		for _, route := range manifest.Spec.Backend.Routes {
			for _, method := range route.Methods {
				routes = append(routes, method+" "+route.Path)
			}
		}
	}

	return routes
}

// Helper functions for file operations

// extractTarGz extracts a tar.gz file to the specified directory
func extractTarGz(tarGzPath, extractPath string) error {
	// Open the tar.gz file
	file, err := os.Open(tarGzPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Create gzip reader
	gzr, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzr.Close()

	// Create tar reader
	tr := tar.NewReader(gzr)

	// Extract files
	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// Skip if it's a directory
		if header.Typeflag == tar.TypeDir {
			continue
		}

		// Create the file path
		target := filepath.Join(extractPath, header.Name)

		// Create directory if it doesn't exist
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}

		// Create the file
		f, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR, os.FileMode(header.Mode))
		if err != nil {
			return err
		}

		// Copy file contents
		if _, err := io.Copy(f, tr); err != nil {
			f.Close()
			return err
		}
		f.Close()
	}

	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// copyDir copies a directory recursively
func copyDir(src, dst string) error {
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := os.MkdirAll(dstPath, 0755); err != nil {
				return err
			}
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}

	return nil
}
