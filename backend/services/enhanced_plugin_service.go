package services

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/dynamic_plugins"
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
	} else {
		return fmt.Errorf("unsupported plugin source: %s", source)
	}
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

// GetSystemMetrics returns comprehensive system metrics
func (eps *EnhancedPluginService) GetSystemMetrics() map[string]interface{} {
	if !eps.initialized {
		return map[string]interface{}{
			"status": "not_initialized",
		}
	}

	metrics := eps.Manager.GetMetrics()
	metrics["service_initialized"] = eps.initialized
	metrics["config"] = map[string]interface{}{
		"plugin_dir":            eps.Config.PluginDir,
		"cache_dir":             eps.Config.CacheDir,
		"max_plugin_size":       eps.Config.MaxPluginSize,
		"security_mode":         eps.Config.SecurityMode,
		"health_checks_enabled": eps.Config.EnableHealthChecks,
		"auto_updates_enabled":  eps.Config.EnableAutoUpdates,
		"allowed_repos_count":   len(eps.Config.AllowedRepos),
	}

	return metrics
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
	// For now, return some example plugins
	return []map[string]interface{}{
		{
			"id":          "kubestellar-cluster-plugin",
			"name":        "KubeStellar Cluster Management",
			"description": "Plugin for cluster onboarding and detachment operations",
			"version":     "1.0.0",
			"author":      "CNCF LFX Mentee",
			"repository":  "https://github.com/kubestellar/cluster-plugin",
			"official":    true,
			"category":    "cluster-management",
			"tags":        []string{"cluster", "onboarding", "management"},
		},
		{
			"id":          "monitoring-plugin",
			"name":        "KubeStellar Monitoring",
			"description": "Enhanced monitoring and metrics collection plugin",
			"version":     "0.9.0",
			"author":      "Community",
			"repository":  "https://github.com/kubestellar/monitoring-plugin",
			"official":    false,
			"category":    "monitoring",
			"tags":        []string{"monitoring", "metrics", "observability"},
		},
	}
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
