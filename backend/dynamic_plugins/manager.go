package dynamic_plugins

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"plugin"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/go-github/v57/github"
	"gopkg.in/yaml.v2"
)

// EnhancedPluginManager provides comprehensive plugin management
type EnhancedPluginManager struct {
	registry        *EnhancedPluginRegistry
	router          *gin.Engine
	pluginDir       string
	cacheDir        string
	githubClient    *github.Client
	validator       PluginValidator
	securityConfig  SecurityConfig
	mutex           sync.RWMutex
	healthChecker   *HealthChecker
	eventHandlers   map[string][]func(string, interface{})
	buildCache      map[string]time.Time
	allowedRepos    []string
	maxPluginSize   int64
	downloadTimeout time.Duration
}

// PluginEvent represents different plugin lifecycle events
type PluginEvent string

const (
	EventPluginLoading   PluginEvent = "plugin.loading"
	EventPluginLoaded    PluginEvent = "plugin.loaded"
	EventPluginUnloading PluginEvent = "plugin.unloading"
	EventPluginUnloaded  PluginEvent = "plugin.unloaded"
	EventPluginError     PluginEvent = "plugin.error"
	EventPluginHealthy   PluginEvent = "plugin.healthy"
	EventPluginUnhealthy PluginEvent = "plugin.unhealthy"
)

// ManagerConfig contains configuration for the plugin manager
type ManagerConfig struct {
	PluginDir       string
	CacheDir        string
	MaxPluginSize   int64
	DownloadTimeout time.Duration
	AllowedRepos    []string
	SecurityConfig  SecurityConfig
}

// NewEnhancedPluginManager creates a new enhanced plugin manager
func NewEnhancedPluginManager(router *gin.Engine, config ManagerConfig) *EnhancedPluginManager {
	if config.PluginDir == "" {
		config.PluginDir = "./dynamic_plugins/cache"
	}
	if config.CacheDir == "" {
		config.CacheDir = "./dynamic_plugins/build_cache"
	}
	if config.MaxPluginSize == 0 {
		config.MaxPluginSize = 100 * 1024 * 1024 // 100MB default
	}
	if config.DownloadTimeout == 0 {
		config.DownloadTimeout = 10 * time.Minute // 10 minutes default
	}

	// Convert to absolute paths to avoid working directory issues
	absPluginDir, err := filepath.Abs(config.PluginDir)
	if err != nil {
		log.Printf("Warning: Failed to get absolute path for plugin dir, using relative: %v", err)
		absPluginDir = config.PluginDir
	}

	absCacheDir, err := filepath.Abs(config.CacheDir)
	if err != nil {
		log.Printf("Warning: Failed to get absolute path for cache dir, using relative: %v", err)
		absCacheDir = config.CacheDir
	}

	manager := &EnhancedPluginManager{
		registry:        NewEnhancedPluginRegistry(),
		router:          router,
		pluginDir:       absPluginDir,
		cacheDir:        absCacheDir,
		githubClient:    github.NewClient(nil),
		validator:       NewPluginValidator(),
		securityConfig:  config.SecurityConfig,
		healthChecker:   NewHealthChecker(),
		eventHandlers:   make(map[string][]func(string, interface{})),
		buildCache:      make(map[string]time.Time),
		allowedRepos:    config.AllowedRepos,
		maxPluginSize:   config.MaxPluginSize,
		downloadTimeout: config.DownloadTimeout,
	}

	// Create necessary directories
	os.MkdirAll(absPluginDir, 0755)
	os.MkdirAll(absCacheDir, 0755)

	// Start health checker
	go manager.startHealthChecker()

	log.Printf("🔌 Plugin manager initialized with directories: plugin=%s, cache=%s", absPluginDir, absCacheDir)

	return manager
}

// LoadPluginFromGitHub downloads and loads a plugin from GitHub repository
func (epm *EnhancedPluginManager) LoadPluginFromGitHub(repoURL string, version string) error {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	log.Printf("🔨 Enhanced loading plugin from GitHub: %s (version: %s)", repoURL, version)

	// Validate repository URL
	if err := epm.validateRepositoryURL(repoURL); err != nil {
		return fmt.Errorf("repository validation failed: %w", err)
	}

	// Emit loading event
	epm.emitEvent(EventPluginLoading, repoURL, map[string]interface{}{
		"repo_url": repoURL,
		"version":  version,
	})

	// Create temp directory for building
	tempDir, err := os.MkdirTemp("", "enhanced-plugin-build-")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	// defer os.RemoveAll(tempDir) // Temporarily disabled for debugging

	log.Printf("📁 Using temp directory: %s", tempDir)

	// Clone repository with depth 1 for faster cloning
	cloneCmd := exec.Command("git", "clone", "--depth", "1")
	if version != "" && version != "latest" {
		cloneCmd.Args = append(cloneCmd.Args, "--branch", version)
	}
	cloneCmd.Args = append(cloneCmd.Args, repoURL, tempDir)

	if output, err := cloneCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to clone repo: %w\nOutput: %s", err, string(output))
	}
	log.Printf("✅ Repository cloned successfully")

	// Validate required files
	if err := epm.validatePluginStructure(tempDir); err != nil {
		return fmt.Errorf("plugin structure validation failed: %w", err)
	}

	// Read and validate manifest
	manifest, err := epm.readAndValidateManifest(tempDir)
	if err != nil {
		return fmt.Errorf("manifest validation failed: %w", err)
	}

	// Check if plugin already exists
	if epm.registry.Exists(manifest.ID) {
		return fmt.Errorf("plugin %s is already loaded", manifest.ID)
	}

	// Build plugin with enhanced error handling
	pluginPath, err := epm.buildPluginEnhanced(tempDir, manifest)
	if err != nil {
		log.Printf("🐛 Build failed, temp directory preserved for debugging: %s", tempDir)
		epm.emitEvent(EventPluginError, manifest.ID, map[string]interface{}{
			"error": err.Error(),
			"stage": "build",
		})
		return fmt.Errorf("plugin build failed: %w", err)
	}

	// Load and initialize plugin
	if err := epm.loadPluginFromPath(pluginPath, manifest); err != nil {
		epm.emitEvent(EventPluginError, manifest.ID, map[string]interface{}{
			"error": err.Error(),
			"stage": "load",
		})
		return fmt.Errorf("plugin loading failed: %w", err)
	}

	// Emit success event
	epm.emitEvent(EventPluginLoaded, manifest.ID, map[string]interface{}{
		"plugin_id": manifest.ID,
		"version":   manifest.Version,
		"repo_url":  repoURL,
	})

	log.Printf("🎉 Enhanced plugin '%s' loaded successfully!", manifest.ID)
	return nil
}

// LoadPluginFromFile loads a plugin from local files with validation
func (epm *EnhancedPluginManager) LoadPluginFromFile(pluginPath, manifestPath string) error {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	log.Printf("📂 Loading plugin from local files: %s", pluginPath)

	// Validate file existence and permissions
	if err := epm.validateLocalFiles(pluginPath, manifestPath); err != nil {
		return fmt.Errorf("file validation failed: %w", err)
	}

	// Read and validate manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %w", err)
	}

	// Validate manifest
	if err := epm.validator.ValidateMetadata(manifest); err != nil {
		return fmt.Errorf("manifest validation failed: %w", err)
	}

	// Load plugin
	return epm.loadPluginFromPath(pluginPath, manifest)
}

// UnloadPlugin unloads a plugin with proper cleanup
func (epm *EnhancedPluginManager) UnloadPlugin(pluginID string) error {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	log.Printf("🗑️ Unloading plugin: %s", pluginID)

	// Emit unloading event
	epm.emitEvent(EventPluginUnloading, pluginID, map[string]interface{}{
		"plugin_id": pluginID,
	})

	// Remove routes first
	if err := epm.removePluginRoutes(pluginID); err != nil {
		log.Printf("Warning: Failed to remove routes for plugin %s: %v", pluginID, err)
	}

	// Unregister from registry (this calls plugin cleanup)
	if err := epm.registry.Unregister(pluginID); err != nil {
		return fmt.Errorf("failed to unregister plugin: %w", err)
	}

	// Emit unloaded event
	epm.emitEvent(EventPluginUnloaded, pluginID, map[string]interface{}{
		"plugin_id": pluginID,
	})

	log.Printf("✅ Plugin '%s' unloaded successfully", pluginID)
	return nil
}

// ReloadPlugin reloads a plugin with the same configuration
func (epm *EnhancedPluginManager) ReloadPlugin(pluginID string) error {
	// Get current plugin info
	registeredPlugin, exists := epm.registry.GetRegistered(pluginID)
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", pluginID)
	}

	loadedFrom := registeredPlugin.LoadedFrom

	// Unload current plugin
	if err := epm.UnloadPlugin(pluginID); err != nil {
		return fmt.Errorf("failed to unload plugin for reload: %w", err)
	}

	// Reload from source
	if strings.Contains(loadedFrom, "github.com") || strings.Contains(loadedFrom, "git") {
		return epm.LoadPluginFromGitHub(loadedFrom, "")
	} else {
		// For local files, we need the manifest path
		manifestPath := strings.Replace(loadedFrom, ".so", ".yaml", 1)
		return epm.LoadPluginFromFile(loadedFrom, manifestPath)
	}
}

// GetPlugin retrieves a plugin by ID
func (epm *EnhancedPluginManager) GetPlugin(pluginID string) (*RegisteredPlugin, bool) {
	return epm.registry.GetRegistered(pluginID)
}

// ListPlugins returns all loaded plugins with detailed information
func (epm *EnhancedPluginManager) ListPlugins() map[string]*RegisteredPlugin {
	return epm.registry.ListDetailed()
}

// GetPluginStatus returns the status of a specific plugin
func (epm *EnhancedPluginManager) GetPluginStatus(pluginID string) (PluginStatus, bool) {
	return epm.registry.GetStatus(pluginID)
}

// GetMetrics returns comprehensive plugin system metrics
func (epm *EnhancedPluginManager) GetMetrics() map[string]interface{} {
	metrics := epm.registry.GetMetrics()

	// Add manager-specific metrics
	metrics["build_cache_size"] = len(epm.buildCache)
	metrics["manager_uptime"] = time.Since(time.Now()).String() // This would be set during initialization
	metrics["allowed_repos"] = len(epm.allowedRepos)

	return metrics
}

// ValidatePlugin validates a plugin without loading it
func (epm *EnhancedPluginManager) ValidatePlugin(pluginPath, manifestPath string) error {
	// Validate files exist
	if err := epm.validateLocalFiles(pluginPath, manifestPath); err != nil {
		return err
	}

	// Read manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %w", err)
	}

	// Validate manifest
	return epm.validator.ValidateMetadata(manifest)
}

// AddEventHandler adds an event handler for plugin lifecycle events
func (epm *EnhancedPluginManager) AddEventHandler(event PluginEvent, handler func(string, interface{})) {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	eventStr := string(event)
	if epm.eventHandlers[eventStr] == nil {
		epm.eventHandlers[eventStr] = make([]func(string, interface{}), 0)
	}
	epm.eventHandlers[eventStr] = append(epm.eventHandlers[eventStr], handler)
}

// Private helper methods

func (epm *EnhancedPluginManager) validateRepositoryURL(repoURL string) error {
	if len(epm.allowedRepos) > 0 {
		allowed := false
		for _, allowedRepo := range epm.allowedRepos {
			if strings.Contains(repoURL, allowedRepo) {
				allowed = true
				break
			}
		}
		if !allowed {
			return fmt.Errorf("repository %s is not in allowed list", repoURL)
		}
	}

	// Basic URL validation
	if !strings.Contains(repoURL, "github.com") && !strings.Contains(repoURL, "gitlab.com") {
		return fmt.Errorf("only GitHub and GitLab repositories are supported")
	}

	return nil
}

func (epm *EnhancedPluginManager) validatePluginStructure(pluginDir string) error {
	requiredFiles := []string{"plugin.yaml", "main.go"}

	for _, file := range requiredFiles {
		if _, err := os.Stat(filepath.Join(pluginDir, file)); os.IsNotExist(err) {
			return fmt.Errorf("required file %s not found", file)
		}
	}

	return nil
}

func (epm *EnhancedPluginManager) readAndValidateManifest(pluginDir string) (PluginMetadata, error) {
	manifestPath := filepath.Join(pluginDir, "plugin.yaml")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return PluginMetadata{}, fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return PluginMetadata{}, fmt.Errorf("failed to parse manifest: %w", err)
	}

	if err := epm.validator.ValidateMetadata(manifest); err != nil {
		return PluginMetadata{}, fmt.Errorf("manifest validation failed: %w", err)
	}

	return manifest, nil
}

func (epm *EnhancedPluginManager) buildPluginEnhanced(tempDir string, manifest PluginMetadata) (string, error) {
	// Check build cache
	cacheKey := epm.generateCacheKey(tempDir, manifest)
	if cachedTime, exists := epm.buildCache[cacheKey]; exists {
		if time.Since(cachedTime) < 1*time.Hour { // Cache for 1 hour
			cachedPath := filepath.Join(epm.cacheDir, manifest.ID+".so")
			if _, err := os.Stat(cachedPath); err == nil {
				log.Printf("🚀 Using cached build for plugin: %s", manifest.ID)
				return cachedPath, nil
			}
		}
	}

	// Setup build environment
	if err := epm.setupBuildEnvironment(tempDir); err != nil {
		return "", fmt.Errorf("failed to setup build environment: %w", err)
	}

	// Build plugin with absolute path
	outputPath := filepath.Join(epm.cacheDir, manifest.ID+".so")
	// Convert to absolute path to avoid working directory issues
	absOutputPath, err := filepath.Abs(outputPath)
	if err != nil {
		return "", fmt.Errorf("failed to get absolute path: %w", err)
	}

	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-ldflags=-w -s", "-o", absOutputPath, "main.go")
	buildCmd.Dir = tempDir
	buildCmd.Env = append([]string{
		"CGO_ENABLED=1",
		"GOOS=" + runtime.GOOS,
		"GOARCH=" + runtime.GOARCH,
		"GO111MODULE=on",
	}, os.Environ()...)

	if output, err := buildCmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("build failed: %w\nOutput: %s", err, string(output))
	}

	// Validate built plugin size
	if stat, err := os.Stat(absOutputPath); err == nil {
		if stat.Size() > epm.maxPluginSize {
			os.Remove(absOutputPath)
			return "", fmt.Errorf("plugin size %d exceeds maximum allowed size %d", stat.Size(), epm.maxPluginSize)
		}
	}

	// Update build cache
	epm.buildCache[cacheKey] = time.Now()

	log.Printf("✅ Plugin built successfully: %s", absOutputPath)
	return absOutputPath, nil
}

func (epm *EnhancedPluginManager) setupBuildEnvironment(tempDir string) error {
	backendDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Remove existing go.mod/go.sum from plugin
	os.Remove(filepath.Join(tempDir, "go.mod"))
	os.Remove(filepath.Join(tempDir, "go.sum"))

	// Copy backend's go.mod and go.sum
	backendGoMod := filepath.Join(backendDir, "go.mod")
	tempGoMod := filepath.Join(tempDir, "go.mod")
	if err := epm.copyAndModifyGoMod(backendGoMod, tempGoMod); err != nil {
		return fmt.Errorf("failed to setup go.mod: %w", err)
	}

	backendGoSum := filepath.Join(backendDir, "go.sum")
	tempGoSum := filepath.Join(tempDir, "go.sum")
	if err := epm.copyFile(backendGoSum, tempGoSum); err != nil {
		return fmt.Errorf("failed to copy go.sum: %w", err)
	}

	// Setup local packages (api and dynamic_plugins)
	if err := epm.setupLocalPackages(tempDir); err != nil {
		return fmt.Errorf("failed to setup local packages: %w", err)
	}

	// Modify plugin imports to use local packages
	if err := epm.modifyPluginImports(tempDir); err != nil {
		return fmt.Errorf("failed to modify plugin imports: %w", err)
	}

	return nil
}

func (epm *EnhancedPluginManager) loadPluginFromPath(pluginPath string, manifest PluginMetadata) error {
	// Security validation
	if err := epm.validatePluginSecurity(pluginPath, manifest); err != nil {
		return fmt.Errorf("security validation failed: %w", err)
	}

	// Load plugin
	p, err := plugin.Open(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to open plugin: %w", err)
	}

	// Get plugin symbol
	symbol, err := p.Lookup(PluginSymbol)
	if err != nil {
		return fmt.Errorf("failed to find %s symbol: %w", PluginSymbol, err)
	}

	// Create plugin instance
	var pluginInstance KubestellarPlugin

	// Try the expected type first
	if newPluginFunc, ok := symbol.(NewPluginFunc); ok {
		pluginInstance = newPluginFunc()
	} else if newPluginFuncInterface, ok := symbol.(func() interface{}); ok {
		// Handle plugins that return interface{}
		instance := newPluginFuncInterface()
		if plugin, ok := instance.(KubestellarPlugin); ok {
			pluginInstance = plugin
		} else {
			return fmt.Errorf("plugin instance does not implement KubestellarPlugin interface")
		}
	} else {
		return fmt.Errorf("invalid plugin symbol type")
	}

	if pluginInstance == nil {
		return fmt.Errorf("plugin returned nil instance")
	}

	// Initialize plugin
	manifest.LoadedAt = time.Now().Format(time.RFC3339)
	manifest.LoadedFrom = pluginPath
	if err := pluginInstance.Initialize(manifest.Configuration); err != nil {
		return fmt.Errorf("plugin initialization failed: %w", err)
	}

	// Register plugin
	if err := epm.registry.Register(manifest.ID, pluginInstance); err != nil {
		return fmt.Errorf("failed to register plugin: %w", err)
	}

	// Register routes
	if err := epm.registerPluginRoutes(manifest.ID, pluginInstance); err != nil {
		epm.registry.Unregister(manifest.ID) // Cleanup on failure
		return fmt.Errorf("failed to register routes: %w", err)
	}

	// Update health status
	go epm.checkPluginHealth(manifest.ID)

	return nil
}

func (epm *EnhancedPluginManager) registerPluginRoutes(pluginID string, plugin KubestellarPlugin) error {
	metadata := plugin.GetMetadata()
	handlers := plugin.GetHandlers()

	// Create plugin group
	pluginGroup := epm.router.Group(fmt.Sprintf("/api/plugin-endpoints/%s", pluginID))

	// Add request tracking middleware
	pluginGroup.Use(func(c *gin.Context) {
		epm.registry.IncrementRequestCount(pluginID)
		c.Next()
	})

	// Register endpoints
	for _, endpoint := range metadata.Endpoints {
		handler, exists := handlers[endpoint.Handler]
		if !exists {
			return fmt.Errorf("handler %s not found for endpoint %s", endpoint.Handler, endpoint.Path)
		}

		// Add validation middleware if configured
		if endpoint.Validation != nil {
			handler = epm.addValidationMiddleware(handler, *endpoint.Validation)
		}

		// Add rate limiting if configured
		if endpoint.RateLimit != nil && endpoint.RateLimit.Enabled {
			handler = epm.addRateLimitMiddleware(handler, *endpoint.RateLimit)
		}

		// Register route
		route := fmt.Sprintf("/api/plugin-endpoints/%s%s", pluginID, endpoint.Path)
		switch strings.ToUpper(endpoint.Method) {
		case "GET":
			pluginGroup.GET(endpoint.Path, handler)
		case "POST":
			pluginGroup.POST(endpoint.Path, handler)
		case "PUT":
			pluginGroup.PUT(endpoint.Path, handler)
		case "DELETE":
			pluginGroup.DELETE(endpoint.Path, handler)
		case "PATCH":
			pluginGroup.PATCH(endpoint.Path, handler)
		default:
			return fmt.Errorf("unsupported HTTP method: %s", endpoint.Method)
		}

		// Track registered route
		epm.registry.AddRoute(pluginID, route)
		log.Printf("📍 Registered route: %s %s -> %s", endpoint.Method, route, endpoint.Handler)
	}

	return nil
}

func (epm *EnhancedPluginManager) removePluginRoutes(pluginID string) error {
	// Note: Gin doesn't support dynamic route removal
	// In a production system, you might need to restart the router
	// or use a more sophisticated routing system

	// For now, we just track that routes should be removed
	routes := epm.registry.GetRoutes(pluginID)
	for _, route := range routes {
		epm.registry.RemoveRoute(pluginID, route)
		log.Printf("🗑️ Removed route: %s", route)
	}

	return nil
}

// Helper methods continued in next part...
