package plugins

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// PluginWatcher monitors the plugins directory for changes and automatically reloads plugins
type PluginWatcher struct {
	registry *PluginRegistry
	watcher  *fsnotify.Watcher
	stopChan chan bool
	running  bool
	mu       sync.RWMutex
}

// NewPluginWatcher creates a new plugin watcher
func NewPluginWatcher(registry *PluginRegistry) *PluginWatcher {
	return &PluginWatcher{
		registry: registry,
		stopChan: make(chan bool),
	}
}

// Start begins watching the plugins directory for changes
func (pw *PluginWatcher) Start() error {
	pw.mu.Lock()
	defer pw.mu.Unlock()

	if pw.running {
		return fmt.Errorf("watcher is already running")
	}

	// Create fsnotify watcher
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return fmt.Errorf("failed to create file watcher: %v", err)
	}

	pw.watcher = watcher
	pw.running = true

	// Start watching the plugins directory
	if err := pw.watcher.Add(pw.registry.GetPluginsDirectory()); err != nil {
		pw.watcher.Close()
		pw.running = false
		return fmt.Errorf("failed to watch plugins directory: %v", err)
	}

	// Start the watch loop in a goroutine
	go pw.watchLoop()

	log.Printf("Plugin watcher started for directory: %s", pw.registry.GetPluginsDirectory())
	return nil
}

// Stop stops the plugin watcher
func (pw *PluginWatcher) Stop() error {
	pw.mu.Lock()
	defer pw.mu.Unlock()

	if !pw.running {
		return nil
	}

	// Signal the watch loop to stop
	close(pw.stopChan)

	// Close the watcher
	if pw.watcher != nil {
		pw.watcher.Close()
	}

	pw.running = false
	log.Printf("Plugin watcher stopped")
	return nil
}

// watchLoop is the main event loop for file system events
func (pw *PluginWatcher) watchLoop() {
	for {
		select {
		case event, ok := <-pw.watcher.Events:
			if !ok {
				return
			}
			pw.handleEvent(event)

		case err, ok := <-pw.watcher.Errors:
			if !ok {
				return
			}
			log.Printf("Plugin watcher error: %v", err)

		case <-pw.stopChan:
			return
		}
	}
}

// handleEvent processes file system events
func (pw *PluginWatcher) handleEvent(event fsnotify.Event) {
	// Only process events for plugin.yml files or .wasm files
	if !isPluginFile(event.Name) {
		return
	}

	log.Printf("Plugin file changed: %s (operation: %s)", event.Name, event.Op)

	// Determine the plugin name from the file path
	pluginName := pw.getPluginNameFromPath(event.Name)
	if pluginName == "" {
		return
	}

	// Handle different types of events
	switch event.Op {
	case fsnotify.Write:
		// File was modified - reload the plugin
		pw.handlePluginModification(pluginName)

	case fsnotify.Create:
		// New file was created - check if it's a new plugin
		pw.handlePluginCreation(pluginName)

	case fsnotify.Remove:
		// File was removed - unload the plugin
		pw.handlePluginRemoval(pluginName)

	case fsnotify.Rename:
		// File was renamed - handle as removal and potential creation
		pw.handlePluginRemoval(pluginName)
	}
}

// handlePluginModification handles when a plugin file is modified
func (pw *PluginWatcher) handlePluginModification(pluginName string) {
	log.Printf("Reloading plugin due to modification: %s", pluginName)

	// Add a small delay to ensure file operations are complete
	time.Sleep(100 * time.Millisecond)

	// Reload the plugin
	if err := pw.registry.ReloadPlugin(pluginName); err != nil {
		log.Printf("Failed to reload plugin %s: %v", pluginName, err)
	} else {
		log.Printf("Successfully reloaded plugin: %s", pluginName)
	}
}

// handlePluginCreation handles when a new plugin is created
func (pw *PluginWatcher) handlePluginCreation(pluginName string) {
	log.Printf("New plugin detected: %s", pluginName)

	// Add a small delay to ensure all files are written
	time.Sleep(500 * time.Millisecond)

	// Check if the plugin is complete (has both manifest and WASM file)
	if pw.isPluginComplete(pluginName) {
		// Load the new plugin
		if err := pw.registry.LoadPlugin(pluginName); err != nil {
			log.Printf("Failed to load new plugin %s: %v", pluginName, err)
		} else {
			log.Printf("Successfully loaded new plugin: %s", pluginName)
		}
	}
}

// handlePluginRemoval handles when a plugin is removed
func (pw *PluginWatcher) handlePluginRemoval(pluginName string) {
	log.Printf("Plugin removed: %s", pluginName)

	// Unload the plugin
	if err := pw.registry.UnloadPlugin(pluginName); err != nil {
		log.Printf("Failed to unload plugin %s: %v", pluginName, err)
	} else {
		log.Printf("Successfully unloaded plugin: %s", pluginName)
	}
}

// isPluginFile checks if the file is related to a plugin
func isPluginFile(filePath string) bool {
	fileName := filepath.Base(filePath)
	return fileName == "plugin.yml" || filepath.Ext(fileName) == ".wasm"
}

// getPluginNameFromPath extracts the plugin name from a file path
func (pw *PluginWatcher) getPluginNameFromPath(filePath string) string {
	// Get the directory name containing the file
	dir := filepath.Dir(filePath)

	// Check if this is a subdirectory of the plugins directory
	pluginsDir := pw.registry.GetPluginsDirectory()
	if !isSubdirectory(dir, pluginsDir) {
		return ""
	}

	// Return the directory name as the plugin name
	return filepath.Base(dir)
}

// isSubdirectory checks if a path is a subdirectory of another path
func isSubdirectory(sub, parent string) bool {
	rel, err := filepath.Rel(parent, sub)
	if err != nil {
		return false
	}
	return !filepath.IsAbs(rel) && !strings.HasPrefix(rel, "..")
}

// isPluginComplete checks if a plugin has all required files
func (pw *PluginWatcher) isPluginComplete(pluginName string) bool {
	pluginPath := filepath.Join(pw.registry.GetPluginsDirectory(), pluginName)

	// Check for manifest file
	manifestPath := filepath.Join(pluginPath, "plugin.yml")
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		return false
	}

	// Check for WASM file
	wasmPath := filepath.Join(pluginPath, pluginName+".wasm")
	if _, err := os.Stat(wasmPath); os.IsNotExist(err) {
		return false
	}

	return true
}
