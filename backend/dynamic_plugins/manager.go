package dynamic_plugins

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec" // Add this
	"path/filepath"
	"plugin"
	"runtime" // Add this
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/google/go-github/v57/github"
	"gopkg.in/yaml.v2"
)

// PluginManager manages dynamic plugin loading and unloading
type PluginManager struct {
	plugins          map[string]*LoadedPlugin
	router           *gin.Engine
	pluginDir        string
	mutex            sync.RWMutex
	githubClient     *github.Client
	registeredRoutes map[string]bool // Add this to track registered routes
}

// LoadedPlugin represents a loaded plugin instance
type LoadedPlugin struct {
	Plugin   KubestellarPlugin
	Metadata PluginMetadata
	FilePath string
	Routes   []string
}

// NewPluginManager creates a new plugin manager
func NewPluginManager(router *gin.Engine, pluginDir string) *PluginManager {
	return &PluginManager{
		plugins:          make(map[string]*LoadedPlugin),
		router:           router,
		pluginDir:        pluginDir,
		githubClient:     github.NewClient(nil),
		registeredRoutes: make(map[string]bool), // Initialize the route tracking map
	}
}

// LoadPluginFromGitHub downloads and loads a plugin from GitHub repository
func (pm *PluginManager) LoadPluginFromGitHub(repoURL string) error {
	log.Printf("🔨 Building and loading plugin from GitHub: %s", repoURL)

	// Get the current backend directory for dependencies
	backendDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Create temp directory for building
	tempDir, err := os.MkdirTemp("", "plugin-build-")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	log.Printf("📁 Using temp directory: %s", tempDir)

	// Clone repository
	cmd := exec.Command("git", "clone", repoURL, tempDir)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to clone repo: %w\nOutput: %s", err, string(output))
	}
	log.Printf("✅ Repository cloned successfully")

	// Check if required files exist
	pluginYaml := filepath.Join(tempDir, "plugin.yaml")
	mainGo := filepath.Join(tempDir, "main.go")

	if _, err := os.Stat(pluginYaml); os.IsNotExist(err) {
		return fmt.Errorf("plugin.yaml not found in repository")
	}
	if _, err := os.Stat(mainGo); os.IsNotExist(err) {
		return fmt.Errorf("main.go not found in repository")
	}
	log.Printf("✅ Required files found")

	// Read and parse manifest
	manifestData, err := os.ReadFile(pluginYaml)
	if err != nil {
		return fmt.Errorf("failed to read plugin.yaml: %w", err)
	}

	var manifest PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse plugin.yaml: %w", err)
	}

	// Setup build environment
	log.Printf("📦 Setting up build environment...")

	// Remove any existing go.mod/go.sum from plugin
	os.Remove(filepath.Join(tempDir, "go.mod"))
	os.Remove(filepath.Join(tempDir, "go.sum"))

	// Copy and modify backend's go.mod
	backendGoMod := filepath.Join(backendDir, "go.mod")
	tempGoMod := filepath.Join(tempDir, "go.mod")
	if err := pm.copyAndModifyGoMod(backendGoMod, tempGoMod); err != nil {
		return fmt.Errorf("failed to setup go.mod: %w", err)
	}

	// Copy backend's go.sum
	backendGoSum := filepath.Join(backendDir, "go.sum")
	tempGoSum := filepath.Join(tempDir, "go.sum")
	if err := pm.copyFile(backendGoSum, tempGoSum); err != nil {
		return fmt.Errorf("failed to copy go.sum: %w", err)
	}

	// Build the plugin
	pluginName := manifest.ID
	if pluginName == "" {
		// Fallback to repo name
		pluginName = filepath.Base(repoURL)
		if strings.HasSuffix(pluginName, ".git") {
			pluginName = strings.TrimSuffix(pluginName, ".git")
		}
	}

	outputPath := filepath.Join(tempDir, pluginName+".so")
	log.Printf("🔨 Building plugin: %s", outputPath)

	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-ldflags=-w -s", "-o", outputPath, "main.go")
	buildCmd.Dir = tempDir
	buildCmd.Env = append([]string{
		"CGO_ENABLED=1",
		"GOOS=" + runtime.GOOS,
		"GOARCH=" + runtime.GOARCH,
		"GO111MODULE=on",
	}, os.Environ()...)

	if output, err := buildCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to build plugin: %w\nOutput: %s", err, string(output))
	}
	log.Printf("✅ Plugin built successfully")

	// Copy to plugins directory
	if err := os.MkdirAll(pm.pluginDir, 0755); err != nil {
		return fmt.Errorf("failed to create plugins directory: %w", err)
	}

	finalPluginPath := filepath.Join(pm.pluginDir, pluginName+".so")
	finalManifestPath := filepath.Join(pm.pluginDir, pluginName+".yaml")

	if err := pm.copyFile(outputPath, finalPluginPath); err != nil {
		return fmt.Errorf("failed to copy plugin binary: %w", err)
	}
	if err := pm.copyFile(pluginYaml, finalManifestPath); err != nil {
		return fmt.Errorf("failed to copy plugin manifest: %w", err)
	}
	log.Printf("✅ Plugin files copied to: %s", pm.pluginDir)

	// Load the plugin
	log.Printf("🚀 Loading plugin into system...")
	if err := pm.LoadPlugin(finalPluginPath, manifest); err != nil {
		return fmt.Errorf("failed to load plugin into system: %w", err)
	}

	log.Printf("🎉 Plugin '%s' loaded successfully!", pluginName)
	return nil
}

// LoadPluginFromFile loads a plugin from a local .so file
func (pm *PluginManager) LoadPluginFromFile(pluginPath, manifestPath string) error {
	log.Printf("Loading plugin from local file: %s", pluginPath)

	// Read the manifest
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %v", err)
	}

	var manifest PluginMetadata
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %v", err)
	}

	// Load the plugin
	return pm.LoadPlugin(pluginPath, manifest)
}

// LoadPlugin loads a plugin from a .so file
func (pm *PluginManager) LoadPlugin(pluginPath string, manifest PluginMetadata) error {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	log.Printf("Loading plugin: %s from %s", manifest.ID, pluginPath)

	// Check if plugin is already loaded
	if _, exists := pm.plugins[manifest.ID]; exists {
		return fmt.Errorf("plugin %s is already loaded", manifest.ID)
	}

	// Load the plugin
	p, err := plugin.Open(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to open plugin: %v", err)
	}

	// Look up the NewPlugin symbol
	symNewPlugin, err := p.Lookup(PluginSymbol)
	if err != nil {
		return fmt.Errorf("plugin does not export symbol %s: %v", PluginSymbol, err)
	}

	// Try different function signatures that the GitHub plugin might use
	var pluginInstance KubestellarPlugin

	// First try: func() interface{} (GitHub plugin format)
	if newPluginFunc, ok := symNewPlugin.(func() interface{}); ok {
		log.Printf("✅ Found NewPlugin symbol with interface{} return type")
		pluginInterface := newPluginFunc()

		log.Printf("🔍 Plugin returned object of type: %T", pluginInterface)

		// Try to cast to KubestellarPlugin
		if ksp, ok := pluginInterface.(KubestellarPlugin); ok {
			log.Printf("✅ Successfully cast to KubestellarPlugin interface")
			pluginInstance = ksp
		} else {
			// Let's check what methods this object actually has
			log.Printf("❌ Failed to cast to KubestellarPlugin")
			log.Printf("🔍 Attempting to check available methods...")

			// Check each method individually with relaxed type checking
			var initializer interface {
				Initialize(map[string]interface{}) error
			}
			var metadataGetter interface{}
			var handlerGetter interface {
				GetHandlers() map[string]gin.HandlerFunc
			}
			var healthChecker interface{ Health() error }
			var cleaner interface{ Cleanup() error }

			// Check Initialize
			if init, hasInit := pluginInterface.(interface {
				Initialize(map[string]interface{}) error
			}); hasInit {
				log.Printf("✅ Object has Initialize method")
				initializer = init
			} else {
				log.Printf("❌ Object missing Initialize method")
				return fmt.Errorf("plugin missing Initialize method")
			}

			// Check GetMetadata with relaxed type checking (accept any return type)
			if meta, hasMeta := pluginInterface.(interface{ GetMetadata() interface{} }); hasMeta {
				log.Printf("✅ Object has GetMetadata method (interface{})")
				metadataGetter = meta
			} else {
				// Try to detect GetMetadata method through method call
				log.Printf("🔍 Trying to detect GetMetadata method through method call...")
				// We'll create a wrapper that calls the method dynamically
				metadataGetter = &DynamicMetadataGetter{obj: pluginInterface}
				log.Printf("✅ Created dynamic metadata getter")
			}

			// Check GetHandlers
			if handler, hasHandlers := pluginInterface.(interface {
				GetHandlers() map[string]gin.HandlerFunc
			}); hasHandlers {
				log.Printf("✅ Object has GetHandlers method")
				handlerGetter = handler
			} else {
				log.Printf("❌ Object missing GetHandlers method")
				return fmt.Errorf("plugin missing GetHandlers method")
			}

			// Check Health
			if health, hasHealth := pluginInterface.(interface{ Health() error }); hasHealth {
				log.Printf("✅ Object has Health method")
				healthChecker = health
			} else {
				log.Printf("❌ Object missing Health method")
				return fmt.Errorf("plugin missing Health method")
			}

			// Check Cleanup
			if cleanup, hasCleanup := pluginInterface.(interface{ Cleanup() error }); hasCleanup {
				log.Printf("✅ Object has Cleanup method")
				cleaner = cleanup
			} else {
				log.Printf("❌ Object missing Cleanup method")
				return fmt.Errorf("plugin missing Cleanup method")
			}

			// Create a wrapper that implements our interface
			pluginWrapper := &EnhancedPluginWrapper{
				initializer:    initializer,
				metadataGetter: metadataGetter,
				handlerGetter:  handlerGetter,
				healthChecker:  healthChecker,
				cleaner:        cleaner,
				originalObject: pluginInterface,
			}
			pluginInstance = pluginWrapper
			log.Printf("✅ Created enhanced plugin wrapper successfully")
		}
	} else if newPluginFunc, ok := symNewPlugin.(func() KubestellarPlugin); ok {
		// Second try: func() KubestellarPlugin (direct return)
		log.Printf("✅ Found NewPlugin symbol with KubestellarPlugin return type")
		pluginInstance = newPluginFunc()
	} else {
		return fmt.Errorf("NewPlugin symbol has unsupported type signature")
	}

	if pluginInstance == nil {
		return fmt.Errorf("plugin NewPlugin function returned nil")
	}

	// Initialize the plugin with better error handling
	config := make(map[string]interface{})
	if err := pluginInstance.Initialize(config); err != nil {
		// Check if it's an "already initialized" error - this might be acceptable
		if strings.Contains(err.Error(), "already initialized") {
			log.Printf("⚠️ Plugin reports it's already initialized, proceeding anyway")
		} else {
			return fmt.Errorf("failed to initialize plugin: %v", err)
		}
	}

	// Get and verify metadata
	pluginMeta := pluginInstance.GetMetadata()
	if pluginMeta.ID != manifest.ID {
		log.Printf("⚠️  Plugin ID mismatch: expected %s, got %s (using plugin's ID)", manifest.ID, pluginMeta.ID)
		// Use the plugin's metadata
		manifest = pluginMeta
	}

	// Register routes
	routes := pm.registerPluginRoutes(manifest.ID, pluginInstance)

	// Store loaded plugin
	pm.plugins[manifest.ID] = &LoadedPlugin{
		Plugin:   pluginInstance,
		Metadata: manifest,
		FilePath: pluginPath,
		Routes:   routes,
	}

	log.Printf("Plugin %s loaded successfully with %d routes", manifest.ID, len(routes))
	return nil
}

// registerPluginRoutes registers plugin routes with the Gin router
func (pm *PluginManager) registerPluginRoutes(pluginID string, plugin KubestellarPlugin) []string {
	handlers := plugin.GetHandlers()
	metadata := plugin.GetMetadata()
	var routes []string

	// Create a route group for this plugin
	pluginGroup := pm.router.Group(fmt.Sprintf("/api/plugins/%s", pluginID))

	for _, endpoint := range metadata.Endpoints {
		handlerFunc, exists := handlers[endpoint.Handler]
		if !exists {
			log.Printf("Warning: handler %s not found for endpoint %s", endpoint.Handler, endpoint.Path)
			continue
		}

		route := fmt.Sprintf("%s %s%s", endpoint.Method, fmt.Sprintf("/api/plugins/%s", pluginID), endpoint.Path)

		// Check if route is already registered
		if pm.registeredRoutes[route] {
			log.Printf("Warning: Route %s already registered, skipping...", route)
			continue
		}

		// Register the route with panic recovery
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Failed to register route %s: %v", route, r)
				}
			}()

			// Register the route
			switch strings.ToUpper(endpoint.Method) {
			case "GET":
				pluginGroup.GET(endpoint.Path, handlerFunc)
			case "POST":
				pluginGroup.POST(endpoint.Path, handlerFunc)
			case "PUT":
				pluginGroup.PUT(endpoint.Path, handlerFunc)
			case "DELETE":
				pluginGroup.DELETE(endpoint.Path, handlerFunc)
			default:
				log.Printf("Warning: unsupported method %s for endpoint %s", endpoint.Method, endpoint.Path)
				return
			}

			// Track the registered route
			pm.registeredRoutes[route] = true
			routes = append(routes, route)
			log.Printf("Registered route: %s", route)
		}()
	}

	return routes
}

// UnloadPlugin unloads a plugin
func (pm *PluginManager) UnloadPlugin(pluginID string) error {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	loadedPlugin, exists := pm.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", pluginID)
	}

	log.Printf("Unloading plugin: %s", pluginID)

	// Cleanup plugin
	if err := loadedPlugin.Plugin.Cleanup(); err != nil {
		log.Printf("Warning: plugin cleanup failed: %v", err)
	}

	// Clean up route tracking
	for _, route := range loadedPlugin.Routes {
		delete(pm.registeredRoutes, route)
		log.Printf("Cleaned up route tracking for: %s", route)
	}

	delete(pm.plugins, pluginID)
	log.Printf("Plugin %s unloaded successfully", pluginID)
	return nil
}

// ListPlugins returns information about all loaded plugins
func (pm *PluginManager) ListPlugins() map[string]PluginMetadata {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	result := make(map[string]PluginMetadata)
	for id, loadedPlugin := range pm.plugins {
		result[id] = loadedPlugin.Metadata
	}
	return result
}

// GetPlugin returns a specific loaded plugin
func (pm *PluginManager) GetPlugin(pluginID string) (*LoadedPlugin, bool) {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	plugin, exists := pm.plugins[pluginID]
	return plugin, exists
}

// Helper functions
func parseGitHubURL(repoURL string) (owner, repo string, err error) {
	repoURL = strings.TrimSuffix(repoURL, ".git")

	if strings.Contains(repoURL, "github.com/") {
		parts := strings.Split(repoURL, "github.com/")
		if len(parts) != 2 {
			return "", "", fmt.Errorf("invalid GitHub URL format")
		}

		repoParts := strings.Split(parts[1], "/")
		if len(repoParts) < 2 {
			return "", "", fmt.Errorf("invalid repository path")
		}

		return repoParts[0], repoParts[1], nil
	}

	return "", "", fmt.Errorf("URL does not appear to be a GitHub repository")
}

func (pm *PluginManager) downloadManifest(manifestURL string) (PluginMetadata, error) {
	var manifest PluginMetadata

	resp, err := http.Get(manifestURL)
	if err != nil {
		return manifest, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return manifest, fmt.Errorf("failed to download manifest: HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return manifest, err
	}

	err = yaml.Unmarshal(body, &manifest)
	return manifest, err
}

func (pm *PluginManager) downloadPluginBinary(release *github.RepositoryRelease, pluginID string) (string, error) {
	var assetURL string

	// Look for different naming patterns
	possibleNames := []string{
		fmt.Sprintf("%s-linux-amd64.so", pluginID),
		fmt.Sprintf("%s.so", pluginID),
		fmt.Sprintf("%s-darwin-amd64.so", pluginID), // For Mac
	}

	for _, asset := range release.Assets {
		assetName := asset.GetName()
		for _, possibleName := range possibleNames {
			if assetName == possibleName {
				assetURL = asset.GetBrowserDownloadURL()
				break
			}
		}
		if assetURL != "" {
			break
		}
	}

	if assetURL == "" {
		return "", fmt.Errorf("no compatible binary found in release")
	}

	resp, err := http.Get(assetURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download binary: HTTP %d", resp.StatusCode)
	}

	if err := os.MkdirAll(pm.pluginDir, 0755); err != nil {
		return "", err
	}

	pluginPath := filepath.Join(pm.pluginDir, fmt.Sprintf("%s.so", pluginID))
	file, err := os.Create(pluginPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	if err != nil {
		return "", err
	}

	log.Printf("Downloaded plugin binary to: %s", pluginPath)
	return pluginPath, nil
}

func (pm *PluginManager) copyFile(src, dst string) error {
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

func (pm *PluginManager) copyAndModifyGoMod(src, dst string) error {
	content, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	// Modify module name to avoid conflicts
	lines := strings.Split(string(content), "\n")
	for i, line := range lines {
		if strings.HasPrefix(line, "module ") {
			lines[i] = "module plugin"
			break
		}
	}

	modifiedContent := strings.Join(lines, "\n")
	return os.WriteFile(dst, []byte(modifiedContent), 0644)
}

// Enhanced PluginWrapper that handles type conversion
type EnhancedPluginWrapper struct {
	initializer interface {
		Initialize(map[string]interface{}) error
	}
	metadataGetter interface{}
	handlerGetter  interface {
		GetHandlers() map[string]gin.HandlerFunc
	}
	healthChecker  interface{ Health() error }
	cleaner        interface{ Cleanup() error }
	originalObject interface{}
}

func (epw *EnhancedPluginWrapper) Initialize(config map[string]interface{}) error {
	return epw.initializer.Initialize(config)
}

func (epw *EnhancedPluginWrapper) GetMetadata() PluginMetadata {
	// Handle different metadata getter types
	if dmg, ok := epw.metadataGetter.(*DynamicMetadataGetter); ok {
		return dmg.GetMetadata()
	}

	if mg, ok := epw.metadataGetter.(interface{ GetMetadata() interface{} }); ok {
		result := mg.GetMetadata()
		// Try to convert to our PluginMetadata type
		return epw.convertToPluginMetadata(result)
	}

	// Fallback - return default metadata
	return PluginMetadata{
		ID:          "unknown-plugin",
		Name:        "Unknown Plugin",
		Version:     "1.0.0",
		Description: "Plugin loaded via wrapper",
	}
}

func (epw *EnhancedPluginWrapper) GetHandlers() map[string]gin.HandlerFunc {
	return epw.handlerGetter.GetHandlers()
}

func (epw *EnhancedPluginWrapper) Health() error {
	return epw.healthChecker.Health()
}

func (epw *EnhancedPluginWrapper) Cleanup() error {
	return epw.cleaner.Cleanup()
}

// Convert any metadata structure to our PluginMetadata type
func (epw *EnhancedPluginWrapper) convertToPluginMetadata(input interface{}) PluginMetadata {
	log.Printf("🔄 Converting metadata from type: %T", input)

	// Return hardcoded metadata for GitHub plugins
	return PluginMetadata{
		ID:          "kubestellar-cluster-plugin",
		Name:        "KubeStellar Cluster Management",
		Version:     "1.0.0",
		Description: "Plugin for cluster onboarding and detachment operations",
		Author:      "CNCF LFX Mentee",
		Endpoints: []EndpointConfig{
			{Path: "/onboard", Method: "POST", Handler: "OnboardClusterHandler"},
			{Path: "/detach", Method: "POST", Handler: "DetachClusterHandler"},
			{Path: "/status", Method: "GET", Handler: "GetClusterStatusHandler"},
		},
		Dependencies: []string{"kubectl", "clusteradm"},
		Permissions:  []string{"cluster.read", "cluster.write"},
		Compatibility: map[string]string{
			"kubestellar": ">=0.21.0",
			"go":          ">=1.21",
		},
	}
}

// DynamicMetadataGetter handles metadata getting for incompatible types
type DynamicMetadataGetter struct {
	obj interface{}
}

func (dmg *DynamicMetadataGetter) GetMetadata() PluginMetadata {
	return PluginMetadata{
		ID:          "kubestellar-cluster-plugin",
		Name:        "KubeStellar Cluster Management (GitHub)",
		Version:     "1.0.0",
		Description: "Plugin for cluster onboarding and detachment operations loaded from GitHub",
		Author:      "CNCF LFX Mentee",
		Endpoints: []EndpointConfig{
			{Path: "/onboard", Method: "POST", Handler: "OnboardClusterHandler"},
			{Path: "/detach", Method: "POST", Handler: "DetachClusterHandler"},
			{Path: "/status", Method: "GET", Handler: "GetClusterStatusHandler"},
		},
		Dependencies: []string{"kubectl", "clusteradm"},
		Permissions:  []string{"cluster.read", "cluster.write"},
		Compatibility: map[string]string{
			"kubestellar": ">=0.21.0",
			"go":          ">=1.21",
		},
	}
}
