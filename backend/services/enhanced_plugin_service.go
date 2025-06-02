package services

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/dynamic_plugins"
	"gopkg.in/yaml.v3"
)

// EnhancedPluginService provides high-level plugin management operations
type EnhancedPluginService struct {
	Manager     *dynamic_plugins.EnhancedPluginManager
	Config      *PluginServiceConfig
	initialized bool
}

// PluginServiceConfig contains configuration for the plugin service
type PluginServiceConfig struct {
	PluginDir          string
	CacheDir           string
	AutoLoadPlugins    []string
	AllowedRepos       []string
	MaxPluginSize      int64
	EnableHealthChecks bool
	EnableAutoUpdates  bool
	SecurityMode       string // "strict", "normal", "permissive"
}

// DefaultPluginServiceConfig returns a default configuration
func DefaultPluginServiceConfig() *PluginServiceConfig {
	return &PluginServiceConfig{
		PluginDir:          "./dynamic_plugins/cache",
		CacheDir:           "./dynamic_plugins/build_cache",
		AutoLoadPlugins:    []string{},
		AllowedRepos:       []string{},
		MaxPluginSize:      100 * 1024 * 1024, // 100MB
		EnableHealthChecks: true,
		EnableAutoUpdates:  false,
		SecurityMode:       "normal",
	}
}

// NewEnhancedPluginService creates a new enhanced plugin service
func NewEnhancedPluginService(router *gin.Engine, config *PluginServiceConfig) *EnhancedPluginService {
	if config == nil {
		config = DefaultPluginServiceConfig()
	}

	// Apply environment variable overrides
	if pluginDir := os.Getenv("PLUGIN_DIR"); pluginDir != "" {
		config.PluginDir = pluginDir
	}
	if cacheDir := os.Getenv("PLUGIN_CACHE_DIR"); cacheDir != "" {
		config.CacheDir = cacheDir
	}
	if securityMode := os.Getenv("PLUGIN_SECURITY_MODE"); securityMode != "" {
		config.SecurityMode = securityMode
	}

	// Create directories
	if err := os.MkdirAll(config.PluginDir, 0755); err != nil {
		log.Printf("Warning: Failed to create plugin directory %s: %v", config.PluginDir, err)
	}
	if err := os.MkdirAll(config.CacheDir, 0755); err != nil {
		log.Printf("Warning: Failed to create cache directory %s: %v", config.CacheDir, err)
	}

	// Configure security settings
	securityConfig := dynamic_plugins.SecurityConfig{
		Sandboxed:        config.SecurityMode == "strict",
		NetworkAccess:    config.SecurityMode != "strict",
		FileSystemAccess: config.SecurityMode == "permissive",
	}

	// Create manager configuration
	managerConfig := dynamic_plugins.ManagerConfig{
		PluginDir:      config.PluginDir,
		CacheDir:       config.CacheDir,
		MaxPluginSize:  config.MaxPluginSize,
		AllowedRepos:   config.AllowedRepos,
		SecurityConfig: securityConfig,
	}

	manager := dynamic_plugins.NewEnhancedPluginManager(router, managerConfig)

	service := &EnhancedPluginService{
		Manager: manager,
		Config:  config,
	}

	// Setup event handlers
	service.setupEventHandlers()

	log.Printf("🔌 Enhanced plugin system initialized with directory: %s", config.PluginDir)
	log.Printf("🔒 Security mode: %s", config.SecurityMode)

	return service
}

// Initialize performs service initialization
func (eps *EnhancedPluginService) Initialize() error {
	if eps.initialized {
		return fmt.Errorf("service already initialized")
	}

	// Auto-load plugins if configured
	if err := eps.AutoLoadPlugins(); err != nil {
		log.Printf("Warning: Auto-load plugins failed: %v", err)
	}

	eps.initialized = true
	log.Printf("✅ Enhanced plugin service initialized successfully")
	return nil
}

// AutoLoadPlugins loads plugins from configured sources
func (eps *EnhancedPluginService) AutoLoadPlugins() error {
	autoLoadPlugins := os.Getenv("AUTO_LOAD_PLUGINS")
	if autoLoadPlugins != "" {
		eps.Config.AutoLoadPlugins = strings.Split(autoLoadPlugins, ",")
	}

	if len(eps.Config.AutoLoadPlugins) == 0 {
		log.Printf("📝 No plugins configured for auto-loading")
		return nil
	}

	log.Printf("🚀 Auto-loading %d plugins", len(eps.Config.AutoLoadPlugins))

	loadedCount := 0
	failedCount := 0

	for _, repoURL := range eps.Config.AutoLoadPlugins {
		repoURL = strings.TrimSpace(repoURL)
		if repoURL == "" {
			continue
		}

		go func(url string) {
			log.Printf("📦 Auto-loading plugin from: %s", url)
			if err := eps.Manager.LoadPluginFromGitHub(url, ""); err != nil {
				log.Printf("❌ Failed to auto-load plugin from %s: %v", url, err)
				failedCount++
			} else {
				log.Printf("✅ Successfully auto-loaded plugin from %s", url)
				loadedCount++
			}
		}(repoURL)
	}

	log.Printf("📊 Auto-load summary: %d loaded, %d failed", loadedCount, failedCount)
	return nil
}

// LoadPlugin loads a plugin from various sources
func (eps *EnhancedPluginService) LoadPlugin(source, version string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("🔄 Loading plugin from source: %s", source)

	// Determine source type and load accordingly
	if strings.Contains(source, "github.com") || strings.Contains(source, "gitlab.com") {
		return eps.Manager.LoadPluginFromGitHub(source, version)
	} else if strings.HasSuffix(source, ".so") {
		// Local plugin file
		manifestPath := strings.Replace(source, ".so", ".yaml", 1)
		return eps.Manager.LoadPluginFromFile(source, manifestPath)
	} else if strings.HasPrefix(source, "local:") {
		// Local directory path
		dirPath := strings.TrimPrefix(source, "local:")
		return eps.LoadPluginFromDirectory(dirPath)
	} else {
		return fmt.Errorf("unsupported plugin source: %s", source)
	}
}

// LoadPluginFromDirectory loads a plugin from a local directory
func (eps *EnhancedPluginService) LoadPluginFromDirectory(dirPath string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("📁 Loading plugin from directory: %s", dirPath)

	// Check if directory exists
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		return fmt.Errorf("plugin directory does not exist: %s", dirPath)
	}

	// Check for required files
	manifestPath := fmt.Sprintf("%s/plugin.yaml", dirPath)
	mainGoPath := fmt.Sprintf("%s/main.go", dirPath)

	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		return fmt.Errorf("plugin.yaml not found in directory: %s", dirPath)
	}

	if _, err := os.Stat(mainGoPath); os.IsNotExist(err) {
		return fmt.Errorf("main.go not found in directory: %s", dirPath)
	}

	// Read and validate manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest dynamic_plugins.PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %w", err)
	}

	// Basic manifest validation (skip file validation since we're building locally)
	if manifest.ID == "" {
		return fmt.Errorf("plugin ID is required in manifest")
	}
	if manifest.Name == "" {
		return fmt.Errorf("plugin name is required in manifest")
	}
	if manifest.Version == "" {
		return fmt.Errorf("plugin version is required in manifest")
	}

	// Check if plugin already exists
	if _, exists := eps.Manager.GetPlugin(manifest.ID); exists {
		return fmt.Errorf("plugin %s is already loaded", manifest.ID)
	}

	// Build plugin directly from directory
	outputPath := fmt.Sprintf("%s/%s.so", eps.Config.CacheDir, manifest.ID)
	absOutputPath, err := filepath.Abs(outputPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %w", err)
	}

	// Setup build environment in the plugin directory
	if err := eps.setupLocalBuildEnvironment(dirPath); err != nil {
		return fmt.Errorf("failed to setup build environment: %w", err)
	}

	// Build plugin
	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-ldflags=-w -s", "-o", absOutputPath, "main.go")
	buildCmd.Dir = dirPath
	buildCmd.Env = append([]string{
		"CGO_ENABLED=1",
		"GOOS=" + runtime.GOOS,
		"GOARCH=" + runtime.GOARCH,
		"GO111MODULE=on",
	}, os.Environ()...)

	if output, err := buildCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("build failed: %w\nOutput: %s", err, string(output))
	}

	log.Printf("✅ Plugin built successfully: %s", absOutputPath)

	// Load the built plugin
	return eps.Manager.LoadPluginFromFile(absOutputPath, manifestPath)
}

// setupLocalBuildEnvironment sets up the build environment for local plugin building
func (eps *EnhancedPluginService) setupLocalBuildEnvironment(pluginDir string) error {
	// Get current working directory (should be backend)
	backendDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Copy backend's go.mod and go.sum to plugin directory
	backendGoMod := filepath.Join(backendDir, "go.mod")
	pluginGoMod := filepath.Join(pluginDir, "go.mod")

	// Read backend go.mod
	content, err := os.ReadFile(backendGoMod)
	if err != nil {
		return fmt.Errorf("failed to read backend go.mod: %w", err)
	}

	// Modify module name for plugin
	modifiedContent := strings.Replace(string(content), "module github.com/kubestellar/ui", "module kubestellar-plugin", 1)

	// Write modified go.mod to plugin directory
	if err := os.WriteFile(pluginGoMod, []byte(modifiedContent), 0644); err != nil {
		return fmt.Errorf("failed to write plugin go.mod: %w", err)
	}

	// Copy go.sum
	backendGoSum := filepath.Join(backendDir, "go.sum")
	pluginGoSum := filepath.Join(pluginDir, "go.sum")

	sumContent, err := os.ReadFile(backendGoSum)
	if err != nil {
		return fmt.Errorf("failed to read backend go.sum: %w", err)
	}

	if err := os.WriteFile(pluginGoSum, sumContent, 0644); err != nil {
		return fmt.Errorf("failed to write plugin go.sum: %w", err)
	}

	// Copy the dynamic_plugins package to the plugin directory
	dynamicPluginsDir := filepath.Join(backendDir, "dynamic_plugins")
	pluginDynamicPluginsDir := filepath.Join(pluginDir, "dynamic_plugins")

	if err := eps.copyDirectory(dynamicPluginsDir, pluginDynamicPluginsDir); err != nil {
		return fmt.Errorf("failed to copy dynamic_plugins package: %w", err)
	}

	// Modify the plugin's main.go to use local dynamic_plugins package
	mainGoPath := filepath.Join(pluginDir, "main.go")
	mainGoContent, err := os.ReadFile(mainGoPath)
	if err != nil {
		return fmt.Errorf("failed to read main.go: %w", err)
	}

	// Replace the import path - handle both original and previously modified imports
	modifiedMainGo := strings.Replace(string(mainGoContent),
		`"github.com/kubestellar/ui/dynamic_plugins"`,
		`"kubestellar-plugin/dynamic_plugins"`, -1)
	modifiedMainGo = strings.Replace(modifiedMainGo,
		`"plugin/dynamic_plugins"`,
		`"kubestellar-plugin/dynamic_plugins"`, -1)

	if err := os.WriteFile(mainGoPath, []byte(modifiedMainGo), 0644); err != nil {
		return fmt.Errorf("failed to write modified main.go: %w", err)
	}

	return nil
}

// copyDirectory recursively copies a directory
func (eps *EnhancedPluginService) copyDirectory(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip certain files/directories
		if strings.Contains(path, ".git") || strings.Contains(path, "build_cache") {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		// Copy the file
		return eps.copyFile(path, dstPath)
	})
}

// copyFile copies a single file
func (eps *EnhancedPluginService) copyFile(src, dst string) error {
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

// UnloadPlugin unloads a plugin by ID
func (eps *EnhancedPluginService) UnloadPlugin(pluginID string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("🗑️ Unloading plugin: %s", pluginID)
	return eps.Manager.UnloadPlugin(pluginID)
}

// ReloadPlugin reloads a plugin by ID
func (eps *EnhancedPluginService) ReloadPlugin(pluginID string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("🔄 Reloading plugin: %s", pluginID)
	return eps.Manager.ReloadPlugin(pluginID)
}

// ListPlugins returns all loaded plugins
func (eps *EnhancedPluginService) ListPlugins() map[string]*dynamic_plugins.RegisteredPlugin {
	if !eps.initialized {
		return make(map[string]*dynamic_plugins.RegisteredPlugin)
	}

	return eps.Manager.ListPlugins()
}

// GetPlugin returns a specific plugin by ID
func (eps *EnhancedPluginService) GetPlugin(pluginID string) (*dynamic_plugins.RegisteredPlugin, bool) {
	if !eps.initialized {
		return nil, false
	}

	return eps.Manager.GetPlugin(pluginID)
}

// GetPluginStatus returns the status of a specific plugin
func (eps *EnhancedPluginService) GetPluginStatus(pluginID string) (dynamic_plugins.PluginStatus, bool) {
	if !eps.initialized {
		return dynamic_plugins.PluginStatus{}, false
	}

	return eps.Manager.GetPluginStatus(pluginID)
}

// ValidatePlugin validates a plugin without loading it
func (eps *EnhancedPluginService) ValidatePlugin(pluginPath, manifestPath string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	return eps.Manager.ValidatePlugin(pluginPath, manifestPath)
}

// GetAvailablePlugins returns a list of available plugins from known repositories
func (eps *EnhancedPluginService) GetAvailablePlugins() []map[string]interface{} {
	// In a real implementation, this would query plugin registries/marketplaces
	// Return empty list for now - no dummy data
	return []map[string]interface{}{}
}

// GetPluginCategories returns available plugin categories
func (eps *EnhancedPluginService) GetPluginCategories() []string {
	return []string{
		"cluster-management",
		"monitoring",
		"security",
		"networking",
		"storage",
		"deployment",
		"utilities",
	}
}

// SearchPlugins searches for plugins based on criteria
func (eps *EnhancedPluginService) SearchPlugins(query string, category string) []map[string]interface{} {
	available := eps.GetAvailablePlugins()
	var results []map[string]interface{}

	for _, plugin := range available {
		// Simple search implementation
		if query != "" {
			name := strings.ToLower(plugin["name"].(string))
			description := strings.ToLower(plugin["description"].(string))
			searchQuery := strings.ToLower(query)

			if !strings.Contains(name, searchQuery) && !strings.Contains(description, searchQuery) {
				continue
			}
		}

		if category != "" && plugin["category"].(string) != category {
			continue
		}

		results = append(results, plugin)
	}

	return results
}

// EnablePlugin enables a disabled plugin
func (eps *EnhancedPluginService) EnablePlugin(pluginID string) error {
	// In a real implementation, this would handle plugin state management
	log.Printf("🟢 Enabling plugin: %s", pluginID)
	return nil
}

// DisablePlugin disables an enabled plugin without unloading
func (eps *EnhancedPluginService) DisablePlugin(pluginID string) error {
	// In a real implementation, this would handle plugin state management
	log.Printf("🔴 Disabling plugin: %s", pluginID)
	return nil
}

// UpdatePlugin updates a plugin to the latest version
func (eps *EnhancedPluginService) UpdatePlugin(pluginID string) error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("📈 Updating plugin: %s", pluginID)

	// Check if plugin exists
	_, exists := eps.Manager.GetPlugin(pluginID)
	if !exists {
		return fmt.Errorf("plugin %s not found", pluginID)
	}

	// Reload from source to get the latest version
	return eps.Manager.ReloadPlugin(pluginID)
}

// GetHealthSummary returns a health summary of all plugins
func (eps *EnhancedPluginService) GetHealthSummary() map[string]interface{} {
	if !eps.initialized {
		return map[string]interface{}{
			"status": "service_not_initialized",
		}
	}

	summary := make(map[string]interface{})
	plugins := eps.Manager.ListPlugins()

	healthy := 0
	unhealthy := 0
	unknown := 0

	for pluginID := range plugins {
		if status, exists := eps.Manager.GetPluginStatus(pluginID); exists {
			switch status.Health {
			case dynamic_plugins.HealthHealthy:
				healthy++
			case dynamic_plugins.HealthUnhealthy:
				unhealthy++
			default:
				unknown++
			}
		} else {
			unknown++
		}
	}

	summary["total_plugins"] = len(plugins)
	summary["healthy"] = healthy
	summary["unhealthy"] = unhealthy
	summary["unknown"] = unknown
	summary["overall_health"] = "healthy"

	if unhealthy > 0 {
		summary["overall_health"] = "degraded"
	}
	if unhealthy > healthy {
		summary["overall_health"] = "unhealthy"
	}

	return summary
}

// ClearCache clears the plugin build cache
func (eps *EnhancedPluginService) ClearCache() error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("🧹 Clearing plugin build cache")
	return eps.Manager.ClearBuildCache()
}

// GetCacheInfo returns information about the plugin cache
func (eps *EnhancedPluginService) GetCacheInfo() map[string]interface{} {
	if !eps.initialized {
		return map[string]interface{}{
			"status": "service_not_initialized",
		}
	}

	return eps.Manager.GetBuildCache()
}

// Shutdown gracefully shuts down the plugin service
func (eps *EnhancedPluginService) Shutdown() error {
	if !eps.initialized {
		return fmt.Errorf("service not initialized")
	}

	log.Printf("🛑 Shutting down enhanced plugin service")

	// Cleanup manager resources
	eps.Manager.CleanupResources()

	eps.initialized = false
	log.Printf("✅ Enhanced plugin service shutdown complete")

	return nil
}

// Private helper methods

func (eps *EnhancedPluginService) setupEventHandlers() {
	// Add event handlers for plugin lifecycle events
	eps.Manager.AddEventHandler(dynamic_plugins.EventPluginLoaded, func(pluginID string, data interface{}) {
		log.Printf("🎉 Plugin loaded event: %s", pluginID)
	})

	eps.Manager.AddEventHandler(dynamic_plugins.EventPluginUnloaded, func(pluginID string, data interface{}) {
		log.Printf("👋 Plugin unloaded event: %s", pluginID)
	})

	eps.Manager.AddEventHandler(dynamic_plugins.EventPluginError, func(pluginID string, data interface{}) {
		log.Printf("❌ Plugin error event: %s - %v", pluginID, data)
	})

	eps.Manager.AddEventHandler(dynamic_plugins.EventPluginHealthy, func(pluginID string, data interface{}) {
		log.Printf("💚 Plugin healthy event: %s", pluginID)
	})

	eps.Manager.AddEventHandler(dynamic_plugins.EventPluginUnhealthy, func(pluginID string, data interface{}) {
		log.Printf("💔 Plugin unhealthy event: %s", pluginID)
	})
}

// IsInitialized returns whether the service is initialized
func (eps *EnhancedPluginService) IsInitialized() bool {
	return eps.initialized
}

// GetConfiguration returns the current service configuration
func (eps *EnhancedPluginService) GetConfiguration() *PluginServiceConfig {
	return eps.Config
}

// UpdateConfiguration updates the service configuration
func (eps *EnhancedPluginService) UpdateConfiguration(config *PluginServiceConfig) error {
	if config == nil {
		return fmt.Errorf("configuration cannot be nil")
	}

	eps.Config = config
	log.Printf("🔧 Plugin service configuration updated")

	return nil
}
