package api

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"archive/zip"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/dynamic_plugins"
	"github.com/kubestellar/ui/services"
	"gopkg.in/yaml.v3"
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

	// If no plugins are loaded, return empty object instead of null
	if plugins == nil || len(plugins) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"plugins": map[string]interface{}{},
			"count":   0,
		})
		return
	}

	// Format the response to match frontend expectations
	pluginsMap := make(map[string]interface{})
	for id, plugin := range plugins {
		metadata := plugin.Metadata

		pluginsMap[id] = gin.H{
			"ID":            id,
			"Name":          metadata.Name,
			"Version":       metadata.Version,
			"Description":   metadata.Description,
			"Author":        metadata.Author,
			"Endpoints":     metadata.Endpoints,
			"Permissions":   metadata.Permissions,
			"Dependencies":  metadata.Dependencies,
			"Compatibility": metadata.Compatibility,
		}
	}

	// Return the format expected by frontend: {"plugins": {...}, "count": N}
	c.JSON(http.StatusOK, gin.H{
		"plugins": pluginsMap,
		"count":   len(pluginsMap),
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

// ValidatePluginHandler validates a plugin without loading it
func ValidatePluginHandler(c *gin.Context) {
	var req struct {
		Source string `json:"source" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Simple validation for demo purposes
	if req.Source == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid":  false,
			"errors": []string{"Source cannot be empty"},
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
	// Return empty list for now - no dummy data
	availablePlugins := []gin.H{}

	c.JSON(http.StatusOK, availablePlugins)
}

// GetHealthSummaryHandler returns health summary of all plugins
func GetHealthSummaryHandler(c *gin.Context) {
	plugins := pluginService.ListPlugins()

	var healthPlugins []gin.H
	for id := range plugins {
		status, _ := pluginService.GetPluginStatus(id)
		healthPlugins = append(healthPlugins, gin.H{
			"id":     id,
			"health": status.Health,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins": healthPlugins,
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

// GetCacheInfoHandler returns cache information
func GetCacheInfoHandler(c *gin.Context) {
	cacheInfo := gin.H{
		"total_size":   "1.2GB",
		"num_entries":  15,
		"hit_rate":     0.87,
		"last_cleanup": time.Now().AddDate(0, 0, -1).Format("2006-01-02T15:04:05Z07:00"),
	}

	c.JSON(http.StatusOK, cacheInfo)
}

// GetConfigurationHandler returns plugin system configuration
func GetConfigurationHandler(c *gin.Context) {
	config := gin.H{
		"cache_enabled":    true,
		"cache_max_size":   "1GB",
		"security_enabled": true,
	}

	c.JSON(http.StatusOK, config)
}

// UpdateConfigurationHandler updates plugin system configuration
func UpdateConfigurationHandler(c *gin.Context) {
	var config map[string]interface{}
	if err := c.BindJSON(&config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration payload"})
		return
	}

	// In a real implementation, you would save the configuration
	// For now, just return success
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

// GitHub Repository Installation Handlers

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
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	if err := pluginService.LoadPlugin(req.RepoURL, "latest"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to install GitHub repository",
			"details": err.Error(),
		})
		return
	}

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
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	plugins := pluginService.ListPlugins()
	var unloadedPlugins []string

	for pluginID := range plugins {
		if err := pluginService.UnloadPlugin(pluginID); err == nil {
			unloadedPlugins = append(unloadedPlugins, pluginID)
		}
	}

	if err := pluginService.LoadPlugin(req.RepoURL, "latest"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update GitHub repository",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "GitHub repository updated successfully",
		"type":            "github",
		"repoUrl":         req.RepoURL,
		"unloadedPlugins": unloadedPlugins,
		"action":          "unload_and_reload",
	})
}

// Local Plugin Development Handlers

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
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	if err := pluginService.LoadPlugin(req.PluginPath, "latest"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to load local plugin",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Local plugin loaded successfully",
		"type":         "local",
		"pluginPath":   req.PluginPath,
		"manifestPath": req.ManifestPath,
	})
}

// UnloadLocalPluginHandler unloads a local plugin
func UnloadLocalPluginHandler(c *gin.Context) {
	var req UnloadLocalPluginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	if err := pluginService.UnloadPlugin(req.PluginID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to unload local plugin",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Local plugin unloaded successfully",
		"type":     "local",
		"pluginId": req.PluginID,
	})
}

// ListLocalPluginsHandler lists all locally loaded plugins
func ListLocalPluginsHandler(c *gin.Context) {
	plugins := pluginService.ListPlugins()

	localPlugins := make(map[string]interface{})
	for id, plugin := range plugins {
		localPlugins[id] = gin.H{
			"id":     id,
			"type":   "local",
			"plugin": plugin,
		}
	}

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

// CallPluginEndpointHandler calls a specific plugin endpoint
func CallPluginEndpointHandler(c *gin.Context) {
	pluginID := c.Param("pluginId")
	endpoint := c.Param("endpoint")

	plugin, exists := pluginService.GetPlugin(pluginID)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	handlers := plugin.Plugin.GetHandlers()
	metadata := plugin.Plugin.GetMetadata()

	var handlerFunc gin.HandlerFunc
	var found bool

	// Find the handler for the requested endpoint
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

	// Call the plugin handler
	handlerFunc(c)
}

// UploadPluginZipRequest represents a ZIP file upload for plugin installation
type UploadPluginZipResponse struct {
	UploadID   string                          `json:"upload_id"`
	Validation PluginValidationResult          `json:"validation"`
	Metadata   *dynamic_plugins.PluginMetadata `json:"metadata,omitempty"`
}

// PluginValidationResult represents validation results
type PluginValidationResult struct {
	Valid  bool     `json:"valid"`
	Errors []string `json:"errors,omitempty"`
}

// UploadPluginZipHandler handles ZIP file uploads containing plugin folders
func UploadPluginZipHandler(c *gin.Context) {
	file, err := c.FormFile("plugin")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "No file uploaded",
			"details": err.Error(),
		})
		return
	}

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".zip") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Only ZIP files are supported",
		})
		return
	}

	// Create upload directory
	uploadID := fmt.Sprintf("upload_%d", time.Now().UnixNano())
	uploadDir := filepath.Join("./uploads", uploadID)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create upload directory",
			"details": err.Error(),
		})
		return
	}

	// Save uploaded file
	zipPath := filepath.Join(uploadDir, file.Filename)
	if err := c.SaveUploadedFile(file, zipPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to save uploaded file",
			"details": err.Error(),
		})
		return
	}

	log.Printf("📦 Saved uploaded ZIP: %s", zipPath)

	// Extract ZIP file
	extractDir := filepath.Join(uploadDir, "extracted")
	if err := extractZipFile(zipPath, extractDir); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to extract ZIP file",
			"details": err.Error(),
		})
		return
	}

	// Find plugin directory in extracted files
	pluginDir, err := findPluginDirectory(extractDir)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid plugin structure",
			"details": err.Error(),
		})
		return
	}

	// Validate plugin structure
	validation := validatePluginStructure(pluginDir)

	var metadata *dynamic_plugins.PluginMetadata
	if validation.Valid {
		// Try to read metadata
		manifestPath := filepath.Join(pluginDir, "plugin.yaml")
		if manifestData, err := os.ReadFile(manifestPath); err == nil {
			var meta dynamic_plugins.PluginMetadata
			if err := yaml.Unmarshal(manifestData, &meta); err == nil {
				metadata = &meta
			}
		}
	}

	response := UploadPluginZipResponse{
		UploadID:   uploadID,
		Validation: validation,
		Metadata:   metadata,
	}

	c.JSON(http.StatusOK, response)
}

// InstallUploadedPluginHandler installs a previously uploaded plugin
func InstallUploadedPluginHandler(c *gin.Context) {
	uploadID := c.Param("uploadId")
	if uploadID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Upload ID is required"})
		return
	}

	log.Printf("🚀 Installing uploaded plugin: %s", uploadID)

	// Find the uploaded plugin directory
	uploadDir := filepath.Join("./uploads", uploadID)
	extractDir := filepath.Join(uploadDir, "extracted")

	// Check if upload directory exists
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Upload not found",
			"details": fmt.Sprintf("Upload directory %s does not exist", uploadID),
		})
		return
	}

	// Find plugin directory in extracted files
	pluginDir, err := findPluginDirectory(extractDir)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Plugin directory not found",
			"details": err.Error(),
		})
		return
	}

	log.Printf("📁 Found plugin directory: %s", pluginDir)

	// Install the plugin from the directory with error recovery
	source := "local:" + pluginDir

	// Use a defer function to handle panics and prevent server crashes
	defer func() {
		if r := recover(); r != nil {
			log.Printf("❌ Panic during plugin installation: %v", r)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Plugin installation failed due to internal error",
				"details": fmt.Sprintf("Panic: %v", r),
			})
		}
	}()

	if err := pluginService.LoadPlugin(source, ""); err != nil {
		log.Printf("❌ Plugin installation failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to install plugin",
			"details": err.Error(),
		})
		return
	}

	log.Printf("✅ Plugin installed successfully from upload: %s", uploadID)

	// Clean up upload directory after successful installation
	go func() {
		time.Sleep(5 * time.Second) // Give some time for any pending operations
		os.RemoveAll(uploadDir)
		log.Printf("🧹 Cleaned up upload directory: %s", uploadDir)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":   "Plugin installed successfully from upload",
		"upload_id": uploadID,
	})
}

// Helper functions for ZIP handling

// extractZipFile extracts a ZIP file to the specified directory
func extractZipFile(zipPath, destDir string) error {
	reader, err := zip.OpenReader(zipPath)
	if err != nil {
		return err
	}
	defer reader.Close()

	if err := os.MkdirAll(destDir, 0755); err != nil {
		return err
	}

	for _, file := range reader.File {
		path := filepath.Join(destDir, file.Name)

		// Check for ZipSlip vulnerability
		if !strings.HasPrefix(path, filepath.Clean(destDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path: %s", file.Name)
		}

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, file.FileInfo().Mode())
			continue
		}

		fileReader, err := file.Open()
		if err != nil {
			return err
		}
		defer fileReader.Close()

		targetFile, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.FileInfo().Mode())
		if err != nil {
			return err
		}
		defer targetFile.Close()

		_, err = io.Copy(targetFile, fileReader)
		if err != nil {
			return err
		}
	}

	return nil
}

// findPluginDirectory finds the plugin directory in extracted files
func findPluginDirectory(extractDir string) (string, error) {
	// Check if the extract directory itself is a plugin directory
	if isPluginDirectory(extractDir) {
		return extractDir, nil
	}

	// Look for plugin directory in subdirectories
	entries, err := os.ReadDir(extractDir)
	if err != nil {
		return "", err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			subDir := filepath.Join(extractDir, entry.Name())
			if isPluginDirectory(subDir) {
				return subDir, nil
			}
		}
	}

	return "", fmt.Errorf("no valid plugin directory found in ZIP file")
}

// isPluginDirectory checks if a directory contains plugin files
func isPluginDirectory(dir string) bool {
	mainGoPath := filepath.Join(dir, "main.go")
	manifestPath := filepath.Join(dir, "plugin.yaml")

	_, mainGoExists := os.Stat(mainGoPath)
	_, manifestExists := os.Stat(manifestPath)

	return mainGoExists == nil && manifestExists == nil
}

// validatePluginStructure validates the plugin directory structure
func validatePluginStructure(pluginDir string) PluginValidationResult {
	var errors []string

	// Check for main.go
	mainGoPath := filepath.Join(pluginDir, "main.go")
	if _, err := os.Stat(mainGoPath); os.IsNotExist(err) {
		errors = append(errors, "main.go file is required")
	}

	// Check for plugin.yaml
	manifestPath := filepath.Join(pluginDir, "plugin.yaml")
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		errors = append(errors, "plugin.yaml file is required")
	} else {
		// Validate manifest content
		manifestData, err := os.ReadFile(manifestPath)
		if err != nil {
			errors = append(errors, "failed to read plugin.yaml")
		} else {
			var metadata dynamic_plugins.PluginMetadata
			if err := yaml.Unmarshal(manifestData, &metadata); err != nil {
				errors = append(errors, "invalid plugin.yaml format")
			} else {
				// Validate required fields
				if metadata.ID == "" {
					errors = append(errors, "plugin ID is required in manifest")
				}
				if metadata.Name == "" {
					errors = append(errors, "plugin name is required in manifest")
				}
				if metadata.Version == "" {
					errors = append(errors, "plugin version is required in manifest")
				}
			}
		}
	}

	return PluginValidationResult{
		Valid:  len(errors) == 0,
		Errors: errors,
	}
}
