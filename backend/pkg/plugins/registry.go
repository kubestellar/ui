package plugins

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// PluginRegistry handles plugin discovery, registration, and lifecycle management
type PluginRegistry struct {
	pluginsDirectory string
	manager          *PluginManager
	watcher          *PluginWatcher
}

// PluginInfo contains metadata about a discovered plugin
type PluginInfo struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	Version      string    `json:"version"`
	Author       string    `json:"author,omitempty"`
	Description  string    `json:"description,omitempty"`
	Path         string    `json:"path"`
	ManifestPath string    `json:"manifestPath"`
	WasmPath     string    `json:"wasmPath"`
	DiscoveredAt time.Time `json:"discoveredAt"`
	LastModified time.Time `json:"lastModified"`
	Status       string    `json:"status"` // "discovered", "loaded", "error"
	Error        string    `json:"error,omitempty"`
}

// NewPluginRegistry creates a new plugin registry
func NewPluginRegistry(pluginsDirectory string, manager *PluginManager) *PluginRegistry {
	registry := &PluginRegistry{
		pluginsDirectory: pluginsDirectory,
		manager:          manager,
	}

	// Create plugins directory if it doesn't exist
	if err := os.MkdirAll(pluginsDirectory, 0755); err != nil {
		fmt.Printf("Failed to create plugins directory: %v\n", err)
	}

	// Initialize plugin watcher for hot reloading
	registry.watcher = NewPluginWatcher(registry)

	return registry
}

// DiscoverPlugins scans the plugins directory for available plugins
func (pr *PluginRegistry) DiscoverPlugins() ([]*PluginInfo, error) {
	var plugins []*PluginInfo

	// Walk through the plugins directory
	err := filepath.Walk(pr.pluginsDirectory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip if it's not a directory or is the root plugins directory
		if !info.IsDir() || path == pr.pluginsDirectory {
			return nil
		}

		// Check if this directory contains a plugin
		pluginInfo, err := pr.discoverPluginInDirectory(path)
		if err != nil {
			fmt.Printf("Error discovering plugin in %s: %v\n", path, err)
			return nil // Continue with other directories
		}

		if pluginInfo != nil {
			plugins = append(plugins, pluginInfo)
		}

		return nil
	})

	return plugins, err
}

// discoverPluginInDirectory checks if a directory contains a valid plugin
func (pr *PluginRegistry) discoverPluginInDirectory(dirPath string) (*PluginInfo, error) {
	// Look for plugin.yml manifest
	manifestPath := filepath.Join(dirPath, "plugin.yml")
	manifestInfo, err := os.Stat(manifestPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil // Not a plugin directory
		}
		return nil, err
	}

	// Parse the manifest to get plugin information
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest: %v", err)
	}

	var manifest PluginManifest
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %v", err)
	}

	// Get plugin ID from the folder name
	parts := strings.Split(filepath.Base(dirPath), "-")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid plugin folder name: %s", filepath.Base(dirPath))
	}
	pluginIdStr := parts[len(parts)-1]
	pluginIdFolder, err := strconv.Atoi(pluginIdStr)
	if err != nil {
		return nil, fmt.Errorf("invalid plugin ID in folder name: %s", filepath.Base(dirPath))
	}

	exist, err := CheckInstalledPluginWithID(pluginIdFolder)
	if err != nil {
		return nil, err
	}

	// Check if the plugin ID from the database matches the folder name
	if !exist {
		return nil, fmt.Errorf("plugin ID mismatch: plugin not found, DB ID %d", pluginIdFolder)
	}

	// Check if WASM file exists
	// Determine WASM file name
	wasmFileName := manifest.Metadata.Name + ".wasm"
	if manifest.Spec.Wasm != nil && manifest.Spec.Wasm.File != "" {
		wasmFileName = manifest.Spec.Wasm.File
	}
	wasmPath := filepath.Join(dirPath, wasmFileName)
	wasmInfo, err := os.Stat(wasmPath)

	if err != nil {
		if os.IsNotExist(err) {
			return &PluginInfo{
				ID:           pluginIdFolder,
				Name:         manifest.Metadata.Name,
				Path:         dirPath,
				ManifestPath: manifestPath,
				WasmPath:     wasmPath,
				DiscoveredAt: time.Now(),
				LastModified: manifestInfo.ModTime(),
				Status:       "inactive",
				Error:        "WASM file not found",
			}, nil
		}
		return nil, err
	}

	// // Determine status based on whether plugin is loaded
	// if _, loaded := pr.manager.GetPlugin(manifest.Name); loaded {
	// 	status = "loaded"
	// }

	status := "inactive" // Default status if not loaded

	if exist {
		status, err = GetPluginStatusDB(pluginIdFolder)
		if err != nil {
			return nil, fmt.Errorf("failed to get plugin status: %v", err)
		}
	}

	return &PluginInfo{
		ID:           pluginIdFolder,
		Name:         manifest.Metadata.Name,
		Version:      manifest.Metadata.Version,
		Author:       manifest.Metadata.Author,
		Description:  manifest.Metadata.Description,
		Path:         dirPath,
		ManifestPath: manifestPath,
		WasmPath:     wasmPath,
		DiscoveredAt: time.Now(),
		LastModified: wasmInfo.ModTime(),
		Status:       status,
	}, nil
}

// LoadPlugin loads a plugin by name
func (pr *PluginRegistry) LoadPlugin(name string) error {
	// Find the plugin directory
	pluginPath := filepath.Join(pr.pluginsDirectory, name)
	fmt.Println("pluginPath", pluginPath)
	// Check if directory exists
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		return fmt.Errorf("plugin directory not found: %s", pluginPath)
	}

	// Load the plugin using the manager
	return pr.manager.LoadPlugin(pluginPath)
}

// UnloadPlugin unloads a plugin by ID
func (pr *PluginRegistry) UnloadPlugin(ID int) error {
	return pr.manager.UnloadPlugin(ID)
}

// ReloadPlugin reloads a plugin by name
func (pr *PluginRegistry) ReloadPlugin(pluginID int) error {
	// First unload the plugin
	if err := pr.UnloadPlugin(pluginID); err != nil {
		return fmt.Errorf("failed to unload plugin: %v", err)
	}

	pluginName := pr.manager.plugins[pluginID].Manifest.Metadata.Name
	// Then load it again
	if err := pr.LoadPlugin(pluginName); err != nil {
		return fmt.Errorf("failed to reload plugin: %v", err)
	}

	return nil
}

// GetPluginInfo returns information about a specific plugin
func (pr *PluginRegistry) GetPluginInfo(name string) (*PluginInfo, error) {
	pluginPath := filepath.Join(pr.pluginsDirectory, name)
	// TODO: get user ID from context when it is implemented
	return pr.discoverPluginInDirectory(pluginPath)
}

// StartWatching starts the plugin watcher for hot reloading
func (pr *PluginRegistry) StartWatching() error {
	return pr.watcher.Start()
}

// StopWatching stops the plugin watcher
func (pr *PluginRegistry) StopWatching() error {
	return pr.watcher.Stop()
}

// GetPluginsDirectory returns the plugins directory path
func (pr *PluginRegistry) GetPluginsDirectory() string {
	return pr.pluginsDirectory
}
