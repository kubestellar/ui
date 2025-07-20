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
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/models"
	pkg "github.com/kubestellar/ui/backend/pkg/plugins"

	// "github.com/kubestellar/ui/backend/plugin/plugins"
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
	ID          int       `json:"id"`
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
	PluginID  int       `json:"pluginId" binding:"required"`
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

	if pluginManager == nil || pluginRegistry == nil {
		log.LogError("Plugin manager or registry is not initialized")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Plugin manager or registry is not initialized",
		})
		return
	}
	// Get all loaded plugins
	loadedPlugins := pluginManager.GetPluginList()

	// Convert to API response format
	for _, p := range loadedPlugins {
		if p.Manifest != nil {
			pluginsList = append(pluginsList, PluginDetails{
				ID:          p.ID,
				Name:        p.Manifest.Metadata.Name,
				Version:     p.Manifest.Metadata.Version,
				Enabled:     p.Status == "active",
				Description: p.Manifest.Metadata.Description,
				Author:      p.Manifest.Metadata.Author,
				CreatedAt:   p.LoadTime,
				UpdatedAt:   p.LoadTime,
				Routes:      extractPluginRoutesFromManifest(p.Manifest),
				Status:      p.Status,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins": pluginsList,
		"count":   len(pluginsList),
	})
}

// GetPluginDetailsHandler returns details about a specific plugin
func GetPluginDetailsHandler(c *gin.Context) {
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
		})
		return
	}

	// Check enabled plugins first
	plugin := findPluginByID(pluginID)
	if plugin != nil {
		details := PluginDetails{
			ID:          pluginID,
			Name:        plugin.Manifest.Metadata.Name,
			Version:     plugin.Manifest.Metadata.Version,
			Enabled:     true,
			Description: plugin.Manifest.Metadata.Description,
			Author:      plugin.Manifest.Metadata.Author,
			CreatedAt:   plugin.LoadTime,
			UpdatedAt:   plugin.LoadTime,
			Status:      "active",
			Routes:      extractPluginRoutesFromManifest(plugin.Manifest),
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

	log.LogInfo("extract dir", zap.String("dir", extractDir))

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

	existed, err := pkg.CheckPluginWithInfo(manifest.Metadata.Name, manifest.Metadata.Version, manifest.Metadata.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Error checking plugin exists: " + manifest.Metadata.Name,
		})
		log.LogError("error checking plugin exists", zap.String("error", err.Error()))
		return
	}
	if existed {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Plugin already installed: " + manifest.Metadata.Name,
		})
		log.LogInfo("plugin already installed", zap.String("plugin", manifest.Metadata.Name))
		return
	}

	// get author's ID from DB
	author, err := models.GetUserByUsername(manifest.Metadata.Author)
	log.LogInfo("author ID", zap.Any("id", author.ID))

	// plugin not existed - add to database and retrieve the ID
	pluginID, err := pkg.AddPluginToDB(manifest.Metadata.Name, manifest.Metadata.Version, false, manifest.Metadata.Description, author.ID, "inactive")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Unable to add plugin to database " + manifest.Metadata.Name,
		})
		log.LogError("unable to add plugin to database", zap.String("error", err.Error()))
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

	// combine the plugin name and the ID to make it readable and unique for plugin's Folder
	pluginKey := fmt.Sprintf("%s-%d", manifest.Metadata.Name, pluginID) // e.g. myplugin-123

	// Create plugin directory in plugins folder
	pluginDir := filepath.Join("./plugins", pluginKey)
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
		// Load the plugin from the recent created folder
		if err := pluginRegistry.LoadPlugin(pluginKey); err != nil {
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
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
		})
		return
	}

	log.LogInfo("Starting plugin uninstallation", zap.String("id", strconv.Itoa(pluginID)))

	// Get global plugin manager and registry
	pluginManager := GetGlobalPluginManager()
	pluginRegistry := GetGlobalPluginRegistry()

	// Check if plugin exists in the manager
	if pluginManager == nil || pluginRegistry == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Plugin manager or registry not available",
		})
		return
	}

	var uninstallErrors []string
	var successMessages []string

	// Step 1: Handle new WASM-based plugin system
	log.LogInfo("Processing WASM plugin uninstallation", zap.String("id", strconv.Itoa(pluginID)))

	// Check if plugin exists in the WASM manager
	if plugin, exists := pluginManager.GetPlugin(pluginID); exists {
		log.LogInfo("Found WASM plugin, unloading", zap.String("id", strconv.Itoa(pluginID)))

		// Log plugin details before unloading
		if plugin.Manifest != nil {
			log.LogInfo("Plugin manifest details",
				zap.String("id", strconv.Itoa(pluginID)),
				zap.String("version", plugin.Manifest.Metadata.Version),
				zap.String("author", plugin.Manifest.Metadata.Author),
				zap.String("description", plugin.Manifest.Metadata.Description))
		}

		// Get registered routes before unloading
		registeredRoutes := pluginManager.GetRegisteredRoutes(pluginID)
		if len(registeredRoutes) > 0 {
			successMessages = append(successMessages, fmt.Sprintf("Found %d registered routes", len(registeredRoutes)))
			log.LogInfo("Found registered routes", zap.String("id", strconv.Itoa(pluginID)), zap.Strings("routes", registeredRoutes))
		}

		// Unload the plugin from the manager (this closes WASM instance and removes routes)
		if err := pluginManager.UnloadPlugin(pluginID); err != nil {
			uninstallErrors = append(uninstallErrors, fmt.Sprintf("Failed to unload WASM plugin: %v", err))
			log.LogError("Failed to unload WASM plugin", zap.String("id", strconv.Itoa(pluginID)), zap.Error(err))
		} else {
			successMessages = append(successMessages, "WASM plugin unloaded successfully")
			if len(registeredRoutes) > 0 {
				successMessages = append(successMessages, "Plugin routes removed from router")
			}
			log.LogInfo("WASM plugin unloaded successfully", zap.String("id", strconv.Itoa(pluginID)))
		}
	} else {
		uninstallErrors = append(uninstallErrors, fmt.Sprintf("WASM plugin not found: %d", pluginID))
		log.LogWarn("WASM plugin not found for uninstallation", zap.String("id", strconv.Itoa(pluginID)))
	}

	// Step 2: Remove plugin files from filesystem
	plugin := findPluginByID(pluginID)
	if plugin == nil {
		uninstallErrors = append(uninstallErrors, fmt.Sprintf("Plugin not found in filesystem: %d", pluginID))
		log.LogWarn("Plugin not found in filesystem for uninstallation", zap.String("id", strconv.Itoa(pluginID)))
	} else {
		// get plugin's name
		pluginName := plugin.Manifest.Metadata.Name
		pluginFolder := fmt.Sprintf("%s-%d", pluginName, pluginID)
		pluginDir := filepath.Join("./plugins", pluginFolder)

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
	}

	// Step 3: Remove plugin from database
	if err := pkg.UninstallPluginFromDB(pluginID); err != nil {
		uninstallErrors = append(uninstallErrors, fmt.Sprintf("Failed to remove plugin from database: %v", err))
		log.LogError("Failed to remove plugin from database", zap.String("id", strconv.Itoa(pluginID)), zap.Error(err))
	} else {
		successMessages = append(successMessages, "Plugin removed from database")
		log.LogInfo("Plugin removed from database", zap.String("id", strconv.Itoa(pluginID)))
	}

	// TODO-route: Unregister routes if backend plugin
	// Step 4: Remove routes from Gin router
	// Routes are automatically removed when the plugin is unloaded from the manager
	// The route tracking system ensures routes are properly cleaned up
	log.LogInfo("Plugin routes have been removed from router", zap.String("id", strconv.Itoa(pluginID)))

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
			zap.String("id", strconv.Itoa(pluginID)),
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
			zap.String("id", strconv.Itoa(pluginID)),
			zap.Strings("success", successMessages))
	}
}

// ReloadPluginHandler reloads a plugin
func ReloadPluginHandler(c *gin.Context) {
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
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

	pluginManager := GetGlobalPluginManager()
	if pluginManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Plugin manager not available",
		})
		log.LogError("Plugin manager not available for reloading plugin", zap.String("id", strconv.Itoa(pluginID)))
		return
	}

	// Deregister and re-register the plugin to simulate reload
	pluginManager.DeregisterPlugin(plugin)
	pluginManager.RegisterPlugin(plugin)

	log.LogInfo("Plugin reloaded successfully", zap.String("id", strconv.Itoa(pluginID)))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin reloaded successfully",
		"id":      pluginID,
		"status":  "active",
	})
}

// EnablePluginHandler enables a plugin
func EnablePluginHandler(c *gin.Context) {
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
		})
		log.LogError("Invalid pluginID format", zap.String("id", pluginIDParam), zap.Error(err))
		return
	}

	// Check if plugin is already enabled
	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"message": "Plugin not found",
			"id":      pluginID,
		})
		log.LogWarn("Plugin not found for enabling", zap.String("id", strconv.Itoa(pluginID)))
		return
	}

	// Enable plugin
	pluginManager := GetGlobalPluginManager()
	if pluginManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Plugin manager not available",
		})
		log.LogError("Plugin manager not available for enabling plugin", zap.String("id", strconv.Itoa(pluginID)))
		return
	}
	err = pluginManager.EnablePlugin(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to enable plugin: " + err.Error(),
		})
		log.LogError("Failed to enable plugin", zap.String("id", strconv.Itoa(pluginID)), zap.Error(err))
		return
	}

	log.LogInfo("Plugin enabled successfully", zap.String("id", strconv.Itoa(pluginID)))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin enabled successfully",
		"id":      pluginID,
		"status":  "enabled",
	})
}

// DisablePluginHandler disables a plugin
func DisablePluginHandler(c *gin.Context) {
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
		})
		return
	}

	plugin := findPluginByID(pluginID)
	if plugin == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Plugin not found",
			"id":    pluginID,
		})
		log.LogInfo("Plugin not found for disabling", zap.String("id", strconv.Itoa(pluginID)))
		return
	}

	// Disable plugin
	pluginManager := GetGlobalPluginManager()
	if pluginManager == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Plugin manager not available",
		})
		return
	}
	err = pluginManager.DisablePlugin(pluginID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to disable plugin: " + err.Error(),
		})
		log.LogError("Failed to disable plugin", zap.String("id", strconv.Itoa(pluginID)), zap.Error(err))
		return
	}

	log.LogInfo("Plugin disabled successfully", zap.String("id", strconv.Itoa(pluginID)))

	c.JSON(http.StatusOK, gin.H{
		"message": "Plugin disabled successfully",
		"id":      pluginID,
		"status":  "disabled",
	})
}

// GetPluginStatusHandler returns the status of a plugin
func GetPluginStatusHandler(c *gin.Context) {
	pluginIDParam := c.Param("id")
	pluginID, err := strconv.Atoi(pluginIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Incorrect pluginID",
		})
		return
	}

	// Check enabled plugins first
	plugin := findPluginByID(pluginID)
	if plugin != nil {
		status := gin.H{
			"id":      pluginID,
			"name":    plugin.Manifest.Metadata.Name,
			"version": plugin.Manifest.Metadata.Version,
			"enabled": true,
			"status":  "active",
			"routes":  extractPluginRoutesFromManifest(plugin.Manifest),
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
	allPlugins := getRegisteredPlugins()

	// Count enabled and disabled plugins
	enabledCount := 0
	disabledCount := 0

	for _, plugin := range allPlugins {
		switch plugin.Status {
		case "active":
			enabledCount++
		case "inactive":
			disabledCount++
		}
	}

	// Get system metrics
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	systemConfigMutex.RLock()
	pluginsDir := systemConfig.PluginsDirectory
	systemConfigMutex.RUnlock()

	metrics := PluginSystemMetrics{
		TotalPlugins:     len(allPlugins),
		EnabledPlugins:   enabledCount,
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
		c.JSON(http.StatusNotFound, gin.H{
			"error":    "Plugin not found",
			"pluginId": feedback.PluginID,
		})
		log.LogInfo("Plugin not found for feedback submission",
			zap.String("pluginId", strconv.Itoa(feedback.PluginID)))
		return
	}

	// Set creation time
	feedback.CreatedAt = time.Now()

	// Store feedback
	feedbackMutex.Lock()
	pluginFeedbacks = append(pluginFeedbacks, feedback)
	feedbackMutex.Unlock()

	log.LogInfo("Plugin feedback submitted",
		zap.String("pluginId", strconv.Itoa(feedback.PluginID)),
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

// Helper functions

// getRegisteredPlugins returns all registered plugins
func getRegisteredPlugins() []*pkg.Plugin {
	pluginManager := GetGlobalPluginManager()
	plugins := pluginManager.GetPluginList()

	return plugins
}

// findPluginByID finds a plugin by its ID in the enabled plugins
func findPluginByID(id int) *pkg.Plugin {
	pluginManager := GetGlobalPluginManager()
	loadedPlugins := pluginManager.GetPluginList()
	for _, plugin := range loadedPlugins {
		if plugin.ID == id {
			return plugin
		}
	}
	return nil
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
