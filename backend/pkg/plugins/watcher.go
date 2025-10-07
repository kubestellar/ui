package plugins

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
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

	log.LogInfo("Plugin watcher started for directory", zap.String("directory", pw.registry.GetPluginsDirectory()))
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
	log.LogInfo("Plugin watcher stopped")
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
			log.LogError("Plugin watcher error", zap.String("error", err.Error()))

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

	log.LogInfo("Plugin file changed with operation", zap.String("file", event.Name), zap.String("operation", event.Op.String()))

	// Determine the plugin folder name (pluginKey) from the file path
	pluginFolderName := pw.getPluginFolderName(event.Name)
	if pluginFolderName == "" {
		return
	}

	// The plugin folder name is a combination of the plugin's name and ID - e.g. myplugin-123
	pluginID, err := extractPluginIDFromFolder(pluginFolderName)
	if err != nil {
		log.LogError("unable to extract plugin's ID from folder name", zap.String("error", err.Error()))
		return
	}

	// Handle different types of events
	switch event.Op {
	case fsnotify.Write:
		// File was modified - reload the plugin
		pw.handlePluginModification(pluginID)

	case fsnotify.Create:
		// New file was created - check if it's a new plugin
		pw.handlePluginCreation(pluginID)

	case fsnotify.Remove:
		// File was removed - unload the plugin
		pw.handlePluginRemoval(pluginID)

	case fsnotify.Rename:
		// File was renamed - handle as removal and potential creation
		pw.handlePluginRemoval(pluginID)
	}
}

// handlePluginModification handles when a plugin file is modified
func (pw *PluginWatcher) handlePluginModification(pluginID int) {
	log.LogInfo("Reloading plugin due to modification", zap.String("plugin", strconv.Itoa(pluginID)))

	// Add a small delay to ensure file operations are complete
	time.Sleep(100 * time.Millisecond)

	// Reload the plugin
	if err := pw.registry.ReloadPlugin(pluginID); err != nil {
		log.LogError("Failed to reload plugin", zap.String("plugin", strconv.Itoa(pluginID)), zap.String("error", err.Error()))
	} else {
		log.LogInfo("Successfully reloaded plugin", zap.String("plugin", strconv.Itoa(pluginID)))
	}
}

// handlePluginCreation handles when a new plugin is created
func (pw *PluginWatcher) handlePluginCreation(pluginID int) {
	log.LogInfo("New plugin detected", zap.String("plugin", strconv.Itoa(pluginID)))

	// Add a small delay to ensure all files are written
	time.Sleep(500 * time.Millisecond)

	pluginName := pw.registry.manager.plugins[pluginID].Manifest.Metadata.Name
	// Check if the plugin is complete (has both manifest and WASM file)
	if pw.isPluginComplete(pluginID) {
		// Load the new plugin
		if err := pw.registry.LoadPlugin(pluginName); err != nil {
			log.LogError("Failed to load plugin", zap.String("plugin", strconv.Itoa(pluginID)), zap.String("error", err.Error()))
		} else {
			log.LogInfo("Successfully reloaded plugin", zap.String("plugin", strconv.Itoa(pluginID)))
		}
	}
}

// handlePluginRemoval handles when a plugin is removed
func (pw *PluginWatcher) handlePluginRemoval(pluginID int) {
	log.LogInfo("Plugin removed", zap.String("plugin", strconv.Itoa(pluginID)))

	// Unload the plugin
	if err := pw.registry.UnloadPlugin(pluginID); err != nil {
		log.LogError("Failed to unload plugin", zap.String("plugin", strconv.Itoa(pluginID)), zap.String("error", err.Error()))
	} else {
		log.LogInfo("Successfully unloaded plugin", zap.String("plugin", strconv.Itoa(pluginID)))
	}
}

// isPluginFile checks if the file is related to a plugin
func isPluginFile(filePath string) bool {
	fileName := filepath.Base(filePath)
	return fileName == "plugin.yml" || filepath.Ext(fileName) == ".wasm"
}

// getPluginFolderName extracts the plugin name from a file path
func (pw *PluginWatcher) getPluginFolderName(filePath string) string {
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
func (pw *PluginWatcher) isPluginComplete(pluginID int) bool {
	pluginName := pw.registry.manager.plugins[pluginID].Manifest.Metadata.Name
	pluginKey := fmt.Sprintf("%s-%d", pluginName, pluginID)

	// path = /plugins/<pluginName>-<pluginID>
	pluginPath := filepath.Join(pw.registry.GetPluginsDirectory(), pluginKey)

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

func extractPluginIDFromFolder(pluginFolderName string) (int, error) {
	parts := strings.Split(pluginFolderName, "-")
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid plugin folder name: %s", pluginFolderName)
	}
	idStr := parts[len(parts)-1]
	pluginID, err := strconv.Atoi(idStr)
	if err != nil {
		return 0, fmt.Errorf("invalid plugin ID in folder name: %s", pluginFolderName)
	}

	return pluginID, nil
}
