// Package plugins implements dynamic WASM-based plugin loading and management.
// It supports plugin lifecycle operations, WASM runtime execution using wazero,
// and API route integration via Gin web framework.

package plugins

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
	"gopkg.in/yaml.v3"
)

// PluginManager handles the lifecycle, runtime, and routing of dynamically loaded plugins.
type PluginManager struct {
	runtime wazero.Runtime     // Wazero runtime used to compile and instantiate WASM modules
	plugins map[string]*Plugin // Registered plugin instances by name
	router  *gin.Engine        // Gin router to dynamically add plugin-specific routes
	ctx     context.Context    // Context shared across plugin execution
	mu      sync.RWMutex       // Mutex to manage concurrent plugin map access
}

// Plugin represents a single loaded WASM plugin and its runtime details.
type Plugin struct {
	Manifest *PluginManifest       // Plugin metadata and configuration from plugin.yml
	Module   wazero.CompiledModule // Compiled WASM module
	Instance api.Module            // Instantiated WASM module
	Status   string                // Current status (e.g., Running, Stopped)
	LoadTime time.Time             // Timestamp when the plugin was loaded
}

// PluginManifest defines the plugin.yml schema for plugin configuration.
type PluginManifest struct {
	Name    string        `yaml:"name"`    // Unique name of the plugin (used to identify .wasm file)
	Routes  []PluginRoute `yaml:"routes"`  // HTTP API routes the plugin exposes
	Backend bool          `yaml:"backend"` // Whether plugin requires backend API exposure
}

// PluginRoute describes a single HTTP route exposed by a plugin.
type PluginRoute struct {
	Path    string `yaml:"path"`    // Route path (e.g., /hello)
	Method  string `yaml:"method"`  // HTTP method (GET, POST, etc.)
	Handler string `yaml:"handler"` // Name of the WASM function to call
}

// NewPluginManager initializes a new PluginManager with wazero runtime and Gin router.
func NewPluginManager(router *gin.Engine) *PluginManager {
	ctx := context.Background()
	runtime := wazero.NewRuntimeWithConfig(ctx, wazero.NewRuntimeConfigInterpreter())
	return &PluginManager{
		runtime: runtime,
		plugins: make(map[string]*Plugin),
		router:  router,
		ctx:     ctx,
	}
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
		return err
	}

	wasmPath := filepath.Join(pluginPath, manifest.Name+".wasm")
	wasmBinary, err := os.ReadFile(wasmPath)
	if err != nil {
		return err
	}

	compiledModule, err := pm.runtime.CompileModule(pm.ctx, wasmBinary)
	if err != nil {
		return err
	}

	instance, err := pm.runtime.InstantiateModule(pm.ctx, compiledModule, wazero.NewModuleConfig())
	if err != nil {
		return err
	}

	plugin := &Plugin{
		Manifest: &manifest,
		Module:   compiledModule,
		Instance: instance,
		Status:   "Running",
		LoadTime: time.Now(),
	}

	pm.mu.Lock()
	pm.plugins[manifest.Name] = plugin
	pm.mu.Unlock()

	if manifest.Backend {
		pm.registerPluginRoutes(plugin)
	}

	return nil
}

// registerPluginRoutes maps each declared route from plugin manifest to Gin route group.
func (pm *PluginManager) registerPluginRoutes(plugin *Plugin) {
	group := pm.router.Group("/api/plugins/" + plugin.Manifest.Name)
	for _, route := range plugin.Manifest.Routes {
		handler := pm.createPluginHandler(plugin, route.Handler)
		switch route.Method {
		case "GET":
			group.GET(route.Path, handler)
		case "POST":
			group.POST(route.Path, handler)
		}
	}
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
	return []byte(`{"msg":"called ` + functionName + `"}`), nil // Placeholder
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
func (pm *PluginManager) GetPlugin(name string) (*Plugin, bool) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	p, ok := pm.plugins[name]
	return p, ok
}

// UnloadPlugin terminates and removes a plugin from the manager.
func (pm *PluginManager) UnloadPlugin(name string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	plugin, ok := pm.plugins[name]
	if !ok {
		return errors.New("plugin not found")
	}
	plugin.Instance.Close(pm.ctx)
	delete(pm.plugins, name)
	return nil
}
