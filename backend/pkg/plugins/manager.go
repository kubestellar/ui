// Package plugins implements dynamic WASM-based plugin loading and management.
// It supports plugin lifecycle operations, WASM runtime execution using wazero,
// and API route integration via Gin web framework.

package plugins

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/middleware"
	"github.com/kubestellar/ui/backend/models"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
	"go.uber.org/zap"
	"gopkg.in/yaml.v3"
)

// PluginManager handles the lifecycle, runtime, and routing of dynamically loaded plugins.
type PluginManager struct {
	runtime wazero.Runtime  // Wazero runtime used to compile and instantiate WASM modules
	plugins map[int]*Plugin // Registered plugin instances by ID
	router  *gin.Engine     // Gin router to dynamically add plugin-specific routes
	ctx     context.Context // Context shared across plugin execution
	mu      sync.RWMutex    // Mutex to manage concurrent plugin map access
	// Route tracking for unregistration
	registeredRoutes   map[int][]string // Map of plugin ID to route paths for tracking
	isRegisteredBefore map[int]bool     // Track if plugin routes are registered before
	routeMutex         sync.RWMutex     // Mutex for route tracking
}

// Plugin represents a single loaded WASM plugin and its runtime details.
type Plugin struct {
	ID       int                   `json:"id"`
	Manifest *PluginManifest       // Plugin metadata and configuration from plugin.yml
	Module   wazero.CompiledModule // Compiled WASM module
	Instance api.Module            // Instantiated WASM module
	Status   string                // Current status (e.g., active, inactive)
	LoadTime time.Time             // Timestamp when the plugin was loaded
}

// PluginManifest defines the plugin.yml schema for plugin configuration.
type PluginManifest struct {
	APIVersion string         `yaml:"apiVersion" json:"apiVersion"` // API version
	Kind       string         `yaml:"kind" json:"kind"`             // Resource kind (e.g., "Plugin")
	Metadata   PluginMetadata `yaml:"metadata" json:"metadata"`     // Plugin metadata
	Spec       PluginSpec     `yaml:"spec" json:"spec"`             // Plugin specification
}

// PluginMetadata defines the plugin metadata information
type PluginMetadata struct {
	Name        string `yaml:"name" json:"name"`               // Unique name of the plugin
	Version     string `yaml:"version" json:"version"`         // Plugin version
	Author      string `yaml:"author" json:"author"`           // Plugin author
	Description string `yaml:"description" json:"description"` // Plugin description
}

// PluginSpec contains the plugin specification
type PluginSpec struct {
	Wasm          *PluginWasmConfig     `yaml:"wasm,omitempty" json:"wasm,omitempty"`                   // WASM binary configuration
	Build         *PluginBuildConfig    `yaml:"build,omitempty" json:"build,omitempty"`                 // Build configuration
	Backend       *PluginBackendConfig  `yaml:"backend,omitempty" json:"backend,omitempty"`             // Backend configuration
	Permissions   []string              `yaml:"permissions,omitempty" json:"permissions,omitempty"`     // Required permissions
	Frontend      *PluginFrontendConfig `yaml:"frontend,omitempty" json:"frontend,omitempty"`           // Frontend configuration
	Configuration []PluginConfigItem    `yaml:"configuration,omitempty" json:"configuration,omitempty"` // Plugin configuration options
}

// PluginWasmConfig contains WASM binary information
type PluginWasmConfig struct {
	File        string `yaml:"file" json:"file"`                 // WASM file name
	Entrypoint  string `yaml:"entrypoint" json:"entrypoint"`     // Main function entry point
	MemoryLimit string `yaml:"memory_limit" json:"memory_limit"` // Memory limit (e.g., "64MB")
}

// PluginBuildConfig contains build information
type PluginBuildConfig struct {
	GoVersion     string `yaml:"go_version" json:"go_version"`         // Go version used for building
	TinyGoVersion string `yaml:"tinygo_version" json:"tinygo_version"` // TinyGo version used for WASM compilation
}

// PluginBackendConfig contains backend integration configuration
type PluginBackendConfig struct {
	Enabled bool          `yaml:"enabled" json:"enabled"`                   // Whether backend is enabled
	Routes  []PluginRoute `yaml:"routes,omitempty" json:"routes,omitempty"` // Backend API routes
}

// PluginRoute describes a single HTTP route exposed by a plugin.
type PluginRoute struct {
	Path    string   `yaml:"path" json:"path"`       // Route path (e.g., "/status")
	Methods []string `yaml:"methods" json:"methods"` // HTTP methods
	Handler string   `yaml:"handler" json:"handler"` // Name of the WASM function to call
}

// PluginFrontendConfig contains frontend integration configuration
type PluginFrontendConfig struct {
	Enabled    bool                   `yaml:"enabled" json:"enabled"`                           // Whether frontend integration is enabled
	Navigation []PluginNavigationItem `yaml:"navigation,omitempty" json:"navigation,omitempty"` // Navigation integration
	Widgets    []PluginWidgetConfig   `yaml:"widgets,omitempty" json:"widgets,omitempty"`       // Dashboard widgets
	Routes     []PluginFrontendRoute  `yaml:"routes,omitempty" json:"routes,omitempty"`         // Frontend routes
}

// PluginNavigationItem describes a navigation menu item
type PluginNavigationItem struct {
	Label    string `yaml:"label" json:"label"`       // Display label
	Icon     string `yaml:"icon" json:"icon"`         // Icon identifier
	Path     string `yaml:"path" json:"path"`         // Route path
	Position string `yaml:"position" json:"position"` // Position in menu (e.g., "main")
	Order    int    `yaml:"order" json:"order"`       // Display order
}

// PluginWidgetConfig describes a dashboard widget
type PluginWidgetConfig struct {
	Name      string `yaml:"name" json:"name"`           // Widget name
	Title     string `yaml:"title" json:"title"`         // Widget title
	Size      string `yaml:"size" json:"size"`           // Widget size (e.g., "medium")
	Dashboard string `yaml:"dashboard" json:"dashboard"` // Target dashboard
	Component string `yaml:"component" json:"component"` // React component name
}

// PluginFrontendRoute describes a frontend route definition
type PluginFrontendRoute struct {
	Path      string `yaml:"path" json:"path"`           // Route path
	Component string `yaml:"component" json:"component"` // React component name
	Exact     bool   `yaml:"exact" json:"exact"`         // Whether route matching should be exact
}

// PluginConfigItem describes a configuration option
type PluginConfigItem struct {
	Name        string      `yaml:"name" json:"name"`               // Configuration name
	Type        string      `yaml:"type" json:"type"`               // Type (e.g., "integer", "string")
	Default     interface{} `yaml:"default" json:"default"`         // Default value
	Description string      `yaml:"description" json:"description"` // Description of the configuration
}

// NewPluginManager initializes a new PluginManager with wazero runtime and Gin router.
func NewPluginManager(router *gin.Engine) *PluginManager {
	ctx := context.Background()

	// Configure runtime with WASI support
	config := wazero.NewRuntimeConfigInterpreter()
	runtime := wazero.NewRuntimeWithConfig(ctx, config)

	// Instantiate WASI for plugins, returning error if instantiation fails
	if _, err := wasi_snapshot_preview1.Instantiate(ctx, runtime); err != nil {
		log.LogError("Failed to instantiate WASI", zap.Error(err))
	}

	pm := &PluginManager{
		runtime:            runtime,
		plugins:            make(map[int]*Plugin),
		router:             router,
		ctx:                ctx,
		registeredRoutes:   make(map[int][]string),
		isRegisteredBefore: make(map[int]bool),
	}

	// Register host functions for WASM runtime bridge
	if err := pm.buildHostFunctions(ctx, runtime); err != nil {
		// Log error but continue - this is during initialization
		// In a production system, you might want to handle this differently
		log.LogError("Failed to register host functions", zap.String("error", err.Error()))
	}

	return pm
}

// LoadPlugin loads and initializes a plugin from a given directory.
func (pm *PluginManager) LoadPlugin(pluginPath string) error {
	manifestPath := filepath.Join(pluginPath, "plugin.yml")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return err
	}

	var manifest PluginManifest
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		log.LogError("error unmarshal manifest data", zap.String("error", err.Error()))
		return err
	}

	pluginName := manifest.Metadata.Name
	if pluginName == "" {
		return errors.New("plugin name is required in manifest")
	}
	authorName := manifest.Metadata.Author
	if authorName == "" {
		return errors.New("author name is required in manifest")
	}
	pluginVersion := manifest.Metadata.Version
	if pluginVersion == "" {
		return errors.New("plugin version is required in manifest")
	}

	author, err := models.GetUserByUsername(authorName)
	if err != nil {
		log.LogError("error get authorID", zap.String("error", err.Error()))
		return err
	}

	// Get pluginDetailsID from database
	pluginID, err := GetPluginIDByNameAuthorVersion(pluginName, author.ID, pluginVersion)
	if err != nil {
		log.LogError("error getting pluginID", zap.String("error", err.Error()))
		return err
	}

	// pluginID, err := ExtractPluginPathID(pluginPath)
	// if err != nil {
	// 	log.LogError("error getting pluginID", zap.String("error", err.Error()))
	// 	return err
	// }
	pluginStatus, err := GetPluginStatusDB(pluginID)
	if err != nil {
		log.LogError("error getting plugin status", zap.String("error", err.Error()))
		return err
	}

	// Determine WASM file name
	wasmFileName := manifest.Metadata.Name + ".wasm"
	if manifest.Spec.Wasm != nil && manifest.Spec.Wasm.File != "" {
		wasmFileName = manifest.Spec.Wasm.File
	}
	wasmPath := filepath.Join(pluginPath, wasmFileName)
	wasmBinary, err := os.ReadFile(wasmPath)
	if err != nil {
		log.LogError("error read file .wasm", zap.String("error", err.Error()))
		return err
	}

	compiledModule, err := pm.runtime.CompileModule(pm.ctx, wasmBinary)
	if err != nil {
		log.LogError("error compile module", zap.String("error", err.Error()))
		return err
	}

	// Create module config
	moduleConfig := wazero.NewModuleConfig().WithName(manifest.Metadata.Name).WithStartFunctions(manifest.Spec.Wasm.Entrypoint)

	pm.mu.Lock()
	if existing, ok := pm.plugins[pluginID]; ok {
		_ = existing.Instance.Close(pm.ctx) // close old instance
		delete(pm.plugins, pluginID)
	}
	pm.mu.Unlock()

	instance, err := pm.runtime.InstantiateModule(pm.ctx, compiledModule, moduleConfig)
	if err != nil {
		log.LogError("error instantiate module", zap.String("error", err.Error()))
		return err
	}

	plugin := &Plugin{
		ID:       pluginID,
		Manifest: &manifest,
		Module:   compiledModule,
		Instance: instance,
		Status:   pluginStatus,
		LoadTime: time.Now(),
	}

	pm.mu.Lock()
	pm.plugins[pluginID] = plugin
	pm.mu.Unlock()

	if manifest.Spec.Backend != nil && manifest.Spec.Backend.Enabled {
		pm.registerPluginRoutes(plugin)
	}

	return nil
}

// registerPluginRoutes maps each declared route from plugin manifest to Gin route group.
func (pm *PluginManager) registerPluginRoutes(plugin *Plugin) {
	// check if the routes of this plugin have registered or not
	pm.routeMutex.RLock()
	_, exists := pm.registeredRoutes[plugin.ID]
	pm.routeMutex.RUnlock()

	if exists {
		log.LogInfo("Plugin routes already registered", zap.Int("pluginID", plugin.ID))
		return
	}

	group := pm.router.Group("/api/plugins/" + strconv.Itoa(plugin.ID))

	// middleware to check if plugin is disabled
	group.Use(middleware.PluginMiddleware(pm.IsPluginDisabled))

	// Track routes for this plugin
	pm.routeMutex.Lock()
	pm.registeredRoutes[plugin.ID] = []string{}
	pm.routeMutex.Unlock()

	if plugin.Manifest.Spec.Backend != nil && plugin.Manifest.Spec.Backend.Enabled {
		for _, route := range plugin.Manifest.Spec.Backend.Routes {
			handler := pm.createPluginHandler(plugin, route.Handler)
			routePath := route.Path

			if !pm.isRegisteredBefore[plugin.ID] {
				for _, method := range route.Methods {
					switch method {
					case "GET":
						group.GET(routePath, handler)
					case "POST":
						group.POST(routePath, handler)
					case "PUT":
						group.PUT(routePath, handler)
					case "DELETE":
						group.DELETE(routePath, handler)
					case "PATCH":
						group.PATCH(routePath, handler)
					}
				}
			}

			// Track the registered route
			// Track all methods for the same route path
			pm.routeMutex.Lock()
			for _, method := range route.Methods {
				pm.registeredRoutes[plugin.ID] = append(
					pm.registeredRoutes[plugin.ID],
					fmt.Sprintf("%s %s", method, routePath),
				)
			}
			pm.routeMutex.Unlock()
		}
	}
	// mark as registered
	pm.isRegisteredBefore[plugin.ID] = true
}

// createPluginHandler returns a Gin handler that executes the WASM plugin function.
func (pm *PluginManager) createPluginHandler(plugin *Plugin, handlerName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		body, err := c.GetRawData()
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to read request body"})
			return
		}

		result, err := pm.callPluginFunction(plugin, handlerName, body)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.Data(200, "application/json", result)
	}
}

// callPluginFunction invokes a WASM function by name, passing it serialized input.
func (pm *PluginManager) callPluginFunction(plugin *Plugin, functionName string, input []byte) ([]byte, error) {
	// Get the exported function from the WASM module
	function := plugin.Instance.ExportedFunction(functionName)
	if function == nil {
		return nil, fmt.Errorf("function '%s' not found in plugin", functionName)
	}

	// Allocate memory for input data
	inputPtr, err := pm.allocateMemory(plugin.Instance, len(input))
	if err != nil {
		return nil, fmt.Errorf("failed to allocate memory for input: %v", err)
	}

	// Write input data to WASM memory
	memory := plugin.Instance.Memory()
	if !memory.Write(inputPtr, input) {
		return nil, fmt.Errorf("failed to write input data to WASM memory")
	}

	// Call the WASM function
	results, err := function.Call(pm.ctx, uint64(inputPtr), uint64(len(input)))
	if err != nil {
		return nil, fmt.Errorf("failed to call WASM function: %v", err)
	}

	// Check if we got a result
	if len(results) == 0 {
		return []byte("{}"), nil
	}

	// Extract result pointer and length
	resultPtr := uint32(results[0] >> 32)
	resultLen := uint32(results[0] & 0xFFFFFFFF)

	// Read result from WASM memory
	if resultPtr == 0 || resultLen == 0 {
		return []byte("{}"), nil
	}

	resultData, ok := memory.Read(resultPtr, resultLen)
	if !ok {
		return nil, fmt.Errorf("failed to read result from WASM memory")
	}

	return resultData, nil
}

// GetPluginList returns all registered plugins.
func (pm *PluginManager) GetPluginList() []*Plugin {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	list := make([]*Plugin, 0, len(pm.plugins))
	for _, p := range pm.plugins {
		list = append(list, p)
	}
	return list
}

// GetPlugin retrieves a specific plugin by name.
func (pm *PluginManager) GetPlugin(id int) (*Plugin, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	p, ok := pm.plugins[id]
	return p, ok
}

// UnloadPlugin terminates and removes a plugin from the manager.
func (pm *PluginManager) UnloadPlugin(pluginID int) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	plugin, ok := pm.plugins[pluginID]
	if !ok {
		return errors.New("plugin not found")
	}

	// Close the WASM instance
	if plugin.Instance != nil {
		plugin.Instance.Close(pm.ctx)
	}

	// Remove from plugins map
	delete(pm.plugins, pluginID)

	// Clean up route tracking
	pm.routeMutex.Lock()
	delete(pm.registeredRoutes, pluginID)
	pm.routeMutex.Unlock()

	log.LogInfo("Plugin unloaded successfully", zap.String("plugin", strconv.Itoa(pluginID)))
	return nil
}

// GetRegisteredRoutes returns the list of registered routes for a plugin
func (pm *PluginManager) GetRegisteredRoutes(pluginID int) []string {
	pm.routeMutex.RLock()
	defer pm.routeMutex.RUnlock()

	if routes, exists := pm.registeredRoutes[pluginID]; exists {
		return routes
	}
	return []string{}
}

func (pm *PluginManager) RegisterPlugin(plugin *Plugin, userIDAuth int) {
	// check if the plugin is in database
	// if not, add to database with status "active"
	// if yes, update the status to "active"
	exist, err := CheckInstalledPluginWithInfo(plugin.Manifest.Metadata.Name, plugin.Manifest.Metadata.Version, userIDAuth)
	if err != nil {
		log.LogError("Failed to check plugin existence", zap.Error(err))
		return
	}

	if !exist {
		// Get userID
		author, err := models.GetUserByUsername(plugin.Manifest.Metadata.Author)
		if err != nil {
			log.LogError("Failed to get user ID", zap.Error(err))
			return
		}

		if author == nil {
			log.LogError("User not found for plugin registration", zap.String("author", plugin.Manifest.Metadata.Author))
			return
		}

		_, err = AddInstalledPluginToDB(plugin.ID, nil, author.ID, "manual", true, "active", "/plugins/"+plugin.Manifest.Metadata.Name+"-"+strconv.Itoa(plugin.ID), 0)
		if err != nil {
			log.LogError("Failed to add plugin to installed_plugins  table in database", zap.Error(err))
		}
		err = UpdateInstalledPluginInstalledPath(plugin.ID, "/plugins/"+plugin.Manifest.Metadata.Name+"-"+strconv.Itoa(plugin.ID))
		if err != nil {
			log.LogError("Failed to update installed plugin installed path in database", zap.Error(err))
		}
	} else {
		err = UpdatePluginStatusDB(plugin.ID, "active", userIDAuth)
		if err != nil {
			log.LogError("Failed to update plugin status in database", zap.Error(err))
		}
	}

	// Register the plugin in the manager
	pm.mu.Lock()
	defer pm.mu.Unlock()

	if _, exists := pm.plugins[plugin.ID]; exists {
		log.LogWarn("Plugin already registered", zap.String("plugin", plugin.Manifest.Metadata.Name))
		return
	}

	pm.plugins[plugin.ID] = plugin

	// TODO-route: Register routes if backend plugin
	// if plugin.Manifest.Backend {
	// 	pm.registerPluginRoutes(plugin)
	// }

	log.LogInfo("Plugin registered successfully", zap.Int("plugin", plugin.ID))
}

func (pm *PluginManager) DeregisterPlugin(plugin *Plugin) {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	plugin, exists := pm.plugins[plugin.ID]
	if !exists {
		log.LogWarn("Plugin not found for deregistration", zap.Int("pluginID", plugin.ID))
		return
	}

	// Close the WASM instance
	plugin.Instance.Close(pm.ctx)

	// Remove from plugins map
	delete(pm.plugins, plugin.ID)

	// TODO-route: Unregister routes if backend plugin
	// // Clean up route tracking
	// pm.routeMutex.Lock()
	// delete(pm.registeredRoutes, plugin.ID)
	// pm.routeMutex.Unlock()

}

func (pm *PluginManager) EnablePlugin(pluginID int, userID int) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	plugin, exists := pm.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin not found: %d", pluginID)
	}

	// set plugin status to active
	plugin.Status = "active"

	// Update status in database
	err := UpdatePluginStatusDB(pluginID, "active", userID)
	if err != nil {
		return fmt.Errorf("failed to update plugin status: %v", err)
	}

	// TODO-route: Register routes if backend plugin
	// // Re-register routes if backend plugin
	// if plugin.Manifest.Backend {
	// 	pm.registerPluginRoutes(plugin)
	// }

	log.LogInfo("Plugin enabled successfully", zap.String("plugin", plugin.Manifest.Metadata.Name))
	return nil
}

func (pm *PluginManager) DisablePlugin(pluginID int, userID int) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	plugin, exists := pm.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin not found: %d", pluginID)
	}

	// set plugin status to inactive
	plugin.Status = "inactive"

	// Update status in database
	err := UpdatePluginStatusDB(pluginID, "inactive", userID)
	if err != nil {
		return fmt.Errorf("failed to update plugin status: %v", err)
	}

	// TODO-route: Unregister routes if backend plugin
	// // Remove routes if backend plugin
	// if plugin.Manifest.Backend {
	// 	pm.routeMutex.Lock()
	// 	delete(pm.registeredRoutes, pluginID)
	// 	pm.routeMutex.Unlock()
	// }

	log.LogInfo("Plugin disabled successfully", zap.String("plugin", plugin.Manifest.Metadata.Name))
	return nil
}

func (pm *PluginManager) UninstallAllPlugins() error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for id, plugin := range pm.plugins {
		// Remove plugin from database
		err := UninstallAllPluginFromDB(id)
		if err != nil {
			log.LogError("Failed to uninstall plugin from database", zap.Int("pluginID", id), zap.Error(err))
			continue
		}
		// Close the WASM instance
		plugin.Instance.Close(pm.ctx)

		// Remove from plugins map
		delete(pm.plugins, id)

		// Clean up route tracking
		pm.routeMutex.Lock()
		delete(pm.registeredRoutes, id)
		pm.routeMutex.Unlock()

		log.LogInfo("Plugin uninstalled successfully", zap.String("plugin", plugin.Manifest.Metadata.Name))
	}

	return nil
}

// Helper functions

func ExtractPluginPathID(s string) (int, error) {
	parts := strings.Split(s, "-")
	if len(parts) == 0 {
		return 0, fmt.Errorf("invalid format")
	}
	last := parts[len(parts)-1]
	num, err := strconv.Atoi(last)
	if err != nil {
		return 0, fmt.Errorf("not a number: %w", err)
	}
	return num, nil
}

// IsPluginDisabled checks if a plugin is disabled
func (pm *PluginManager) IsPluginDisabled(id int) bool {
	plugin, exists := pm.GetPlugin(id)
	if !exists {
		return false
	}
	return plugin.Status == "inactive"
}

// santinize input to allow only alphanumeric, underscore, hyphen
var safePattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

func santinize(input string) (string, error) {
	if safePattern.MatchString(input) {
		return input, nil
	}
	return "", fmt.Errorf("input contains unsafe characters: %s", input)
}

func BuildPluginKey(pluginName, author, version string) (string, error) {
	safePluginName, err := santinize(pluginName)
	if err != nil {
		return "", err
	}

	safeAuthor, err := santinize(author)
	if err != nil {
		return "", err
	}

	safeVersion, err := santinize(version)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s~%s~%s", safePluginName, safeAuthor, safeVersion), nil
}
