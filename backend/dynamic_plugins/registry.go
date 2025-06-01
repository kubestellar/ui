package dynamic_plugins

import (
	"fmt"
	"sync"
	"time"
)

// EnhancedPluginRegistry provides thread-safe plugin registry operations
type EnhancedPluginRegistry struct {
	plugins map[string]*RegisteredPlugin
	status  map[string]PluginStatus
	mutex   sync.RWMutex
}

// RegisteredPlugin represents a plugin in the registry
type RegisteredPlugin struct {
	Plugin       KubestellarPlugin
	Metadata     PluginMetadata
	LoadedAt     time.Time
	LoadedFrom   string
	Routes       []string
	RequestCount int64
	Errors       []PluginError
	mutex        sync.RWMutex
}

// NewEnhancedPluginRegistry creates a new enhanced plugin registry
func NewEnhancedPluginRegistry() *EnhancedPluginRegistry {
	return &EnhancedPluginRegistry{
		plugins: make(map[string]*RegisteredPlugin),
		status:  make(map[string]PluginStatus),
	}
}

// Register registers a new plugin in the registry
func (epr *EnhancedPluginRegistry) Register(pluginID string, plugin KubestellarPlugin) error {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if _, exists := epr.plugins[pluginID]; exists {
		return fmt.Errorf("plugin %s is already registered", pluginID)
	}

	metadata := plugin.GetMetadata()
	registeredPlugin := &RegisteredPlugin{
		Plugin:     plugin,
		Metadata:   metadata,
		LoadedAt:   time.Now(),
		LoadedFrom: metadata.LoadedFrom,
		Routes:     make([]string, 0),
		Errors:     make([]PluginError, 0),
	}

	epr.plugins[pluginID] = registeredPlugin
	epr.status[pluginID] = PluginStatus{
		State:        StateLoaded,
		Health:       HealthUnknown,
		LastCheck:    time.Now().Format(time.RFC3339),
		RequestCount: 0,
		Uptime:       "0s",
	}

	return nil
}

// Unregister removes a plugin from the registry
func (epr *EnhancedPluginRegistry) Unregister(pluginID string) error {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	registeredPlugin, exists := epr.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not registered", pluginID)
	}

	// Update status to unloading
	epr.status[pluginID] = PluginStatus{
		State:     StateUnloading,
		Health:    HealthUnknown,
		LastCheck: time.Now().Format(time.RFC3339),
	}

	// Call plugin cleanup if available
	if err := registeredPlugin.Plugin.Cleanup(); err != nil {
		return fmt.Errorf("failed to cleanup plugin %s: %w", pluginID, err)
	}

	// Remove from registry
	delete(epr.plugins, pluginID)
	delete(epr.status, pluginID)

	return nil
}

// Get retrieves a plugin from the registry
func (epr *EnhancedPluginRegistry) Get(pluginID string) (KubestellarPlugin, bool) {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	registeredPlugin, exists := epr.plugins[pluginID]
	if !exists {
		return nil, false
	}

	return registeredPlugin.Plugin, true
}

// GetRegistered retrieves the full registered plugin information
func (epr *EnhancedPluginRegistry) GetRegistered(pluginID string) (*RegisteredPlugin, bool) {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	registeredPlugin, exists := epr.plugins[pluginID]
	return registeredPlugin, exists
}

// List returns all registered plugins
func (epr *EnhancedPluginRegistry) List() map[string]KubestellarPlugin {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	result := make(map[string]KubestellarPlugin)
	for id, registeredPlugin := range epr.plugins {
		result[id] = registeredPlugin.Plugin
	}

	return result
}

// ListDetailed returns detailed information about all registered plugins
func (epr *EnhancedPluginRegistry) ListDetailed() map[string]*RegisteredPlugin {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	result := make(map[string]*RegisteredPlugin)
	for id, registeredPlugin := range epr.plugins {
		// Create a copy to avoid race conditions
		copy := &RegisteredPlugin{
			Plugin:       registeredPlugin.Plugin,
			Metadata:     registeredPlugin.Metadata,
			LoadedAt:     registeredPlugin.LoadedAt,
			LoadedFrom:   registeredPlugin.LoadedFrom,
			Routes:       make([]string, len(registeredPlugin.Routes)),
			RequestCount: registeredPlugin.RequestCount,
			Errors:       make([]PluginError, len(registeredPlugin.Errors)),
		}
		copy.Routes = append(copy.Routes, registeredPlugin.Routes...)
		copy.Errors = append(copy.Errors, registeredPlugin.Errors...)
		result[id] = copy
	}

	return result
}

// Exists checks if a plugin is registered
func (epr *EnhancedPluginRegistry) Exists(pluginID string) bool {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	_, exists := epr.plugins[pluginID]
	return exists
}

// GetStatus retrieves the status of a plugin
func (epr *EnhancedPluginRegistry) GetStatus(pluginID string) (PluginStatus, bool) {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	status, exists := epr.status[pluginID]
	if !exists {
		return PluginStatus{}, false
	}

	// Update uptime if plugin exists
	if registeredPlugin, pluginExists := epr.plugins[pluginID]; pluginExists {
		uptime := time.Since(registeredPlugin.LoadedAt)
		status.Uptime = uptime.String()
		status.RequestCount = registeredPlugin.RequestCount
	}

	return status, true
}

// UpdateStatus updates the status of a plugin
func (epr *EnhancedPluginRegistry) UpdateStatus(pluginID string, status PluginStatus) error {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if _, exists := epr.plugins[pluginID]; !exists {
		return fmt.Errorf("plugin %s is not registered", pluginID)
	}

	status.LastCheck = time.Now().Format(time.RFC3339)
	epr.status[pluginID] = status

	return nil
}

// UpdateHealth updates the health status of a plugin
func (epr *EnhancedPluginRegistry) UpdateHealth(pluginID string, health string) error {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	status, exists := epr.status[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not registered", pluginID)
	}

	status.Health = health
	status.LastCheck = time.Now().Format(time.RFC3339)
	epr.status[pluginID] = status

	return nil
}

// IncrementRequestCount increments the request count for a plugin
func (epr *EnhancedPluginRegistry) IncrementRequestCount(pluginID string) {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.Lock()
		registeredPlugin.RequestCount++
		registeredPlugin.mutex.Unlock()
	}
}

// AddError adds an error to a plugin's error history
func (epr *EnhancedPluginRegistry) AddError(pluginID string, pluginError PluginError) {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.Lock()
		registeredPlugin.Errors = append(registeredPlugin.Errors, pluginError)

		// Keep only the last 10 errors to prevent memory bloat
		if len(registeredPlugin.Errors) > 10 {
			registeredPlugin.Errors = registeredPlugin.Errors[1:]
		}
		registeredPlugin.mutex.Unlock()

		// Update plugin status to error
		if status, statusExists := epr.status[pluginID]; statusExists {
			status.State = StateError
			status.Health = HealthUnhealthy
			status.LastCheck = time.Now().Format(time.RFC3339)
			status.Errors = append(status.Errors, pluginError)

			// Keep only the last 5 errors in status
			if len(status.Errors) > 5 {
				status.Errors = status.Errors[1:]
			}

			epr.status[pluginID] = status
		}
	}
}

// AddRoute adds a route to a plugin's registered routes
func (epr *EnhancedPluginRegistry) AddRoute(pluginID, route string) {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.Lock()
		registeredPlugin.Routes = append(registeredPlugin.Routes, route)
		registeredPlugin.mutex.Unlock()
	}
}

// RemoveRoute removes a route from a plugin's registered routes
func (epr *EnhancedPluginRegistry) RemoveRoute(pluginID, route string) {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.Lock()
		for i, r := range registeredPlugin.Routes {
			if r == route {
				registeredPlugin.Routes = append(registeredPlugin.Routes[:i], registeredPlugin.Routes[i+1:]...)
				break
			}
		}
		registeredPlugin.mutex.Unlock()
	}
}

// GetRoutes returns all routes for a plugin
func (epr *EnhancedPluginRegistry) GetRoutes(pluginID string) []string {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.RLock()
		routes := make([]string, len(registeredPlugin.Routes))
		copy(routes, registeredPlugin.Routes)
		registeredPlugin.mutex.RUnlock()
		return routes
	}

	return []string{}
}

// GetAllRoutes returns a map of all routes across all plugins
func (epr *EnhancedPluginRegistry) GetAllRoutes() map[string][]string {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	result := make(map[string][]string)
	for id, registeredPlugin := range epr.plugins {
		registeredPlugin.mutex.RLock()
		routes := make([]string, len(registeredPlugin.Routes))
		copy(routes, registeredPlugin.Routes)
		registeredPlugin.mutex.RUnlock()
		result[id] = routes
	}

	return result
}

// GetMetrics returns aggregated metrics for all plugins
func (epr *EnhancedPluginRegistry) GetMetrics() map[string]interface{} {
	epr.mutex.RLock()
	defer epr.mutex.RUnlock()

	metrics := map[string]interface{}{
		"total_plugins":     len(epr.plugins),
		"healthy_plugins":   0,
		"unhealthy_plugins": 0,
		"unknown_plugins":   0,
		"total_routes":      0,
		"total_requests":    int64(0),
		"total_errors":      0,
	}

	for _, status := range epr.status {
		switch status.Health {
		case HealthHealthy:
			metrics["healthy_plugins"] = metrics["healthy_plugins"].(int) + 1
		case HealthUnhealthy:
			metrics["unhealthy_plugins"] = metrics["unhealthy_plugins"].(int) + 1
		default:
			metrics["unknown_plugins"] = metrics["unknown_plugins"].(int) + 1
		}

		metrics["total_requests"] = metrics["total_requests"].(int64) + status.RequestCount
		metrics["total_errors"] = metrics["total_errors"].(int) + len(status.Errors)
	}

	for _, registeredPlugin := range epr.plugins {
		registeredPlugin.mutex.RLock()
		metrics["total_routes"] = metrics["total_routes"].(int) + len(registeredPlugin.Routes)
		registeredPlugin.mutex.RUnlock()
	}

	return metrics
}

// ClearErrors clears all errors for a plugin
func (epr *EnhancedPluginRegistry) ClearErrors(pluginID string) {
	epr.mutex.Lock()
	defer epr.mutex.Unlock()

	if registeredPlugin, exists := epr.plugins[pluginID]; exists {
		registeredPlugin.mutex.Lock()
		registeredPlugin.Errors = []PluginError{}
		registeredPlugin.mutex.Unlock()

		if status, statusExists := epr.status[pluginID]; statusExists {
			status.Errors = []PluginError{}
			status.LastCheck = time.Now().Format(time.RFC3339)
			epr.status[pluginID] = status
		}
	}
}
