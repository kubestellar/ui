package dynamic_plugins

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// HealthChecker provides automatic health monitoring for plugins
type HealthChecker struct {
	registry           *EnhancedPluginRegistry
	checkInterval      time.Duration
	checkTimeout       time.Duration
	healthyThreshold   int
	unhealthyThreshold int
	ctx                context.Context
	cancel             context.CancelFunc
	mutex              sync.RWMutex
	pluginHealth       map[string]*PluginHealthData
}

// PluginHealthData stores health monitoring data for a plugin
type PluginHealthData struct {
	consecutiveFailures  int
	consecutiveSuccesses int
	lastCheckTime        time.Time
	lastError            error
	totalChecks          int64
	totalFailures        int64
}

// HealthCheckConfig contains configuration for health checking
type HealthCheckConfig struct {
	CheckInterval      time.Duration
	CheckTimeout       time.Duration
	HealthyThreshold   int
	UnhealthyThreshold int
}

// NewHealthChecker creates a new health checker with default configuration
func NewHealthChecker() *HealthChecker {
	ctx, cancel := context.WithCancel(context.Background())

	return &HealthChecker{
		checkInterval:      30 * time.Second, // Check every 30 seconds
		checkTimeout:       5 * time.Second,  // 5 second timeout per check
		healthyThreshold:   2,                // 2 consecutive successes = healthy
		unhealthyThreshold: 3,                // 3 consecutive failures = unhealthy
		ctx:                ctx,
		cancel:             cancel,
		pluginHealth:       make(map[string]*PluginHealthData),
	}
}

// NewHealthCheckerWithConfig creates a health checker with custom configuration
func NewHealthCheckerWithConfig(config HealthCheckConfig) *HealthChecker {
	ctx, cancel := context.WithCancel(context.Background())

	hc := &HealthChecker{
		checkInterval:      config.CheckInterval,
		checkTimeout:       config.CheckTimeout,
		healthyThreshold:   config.HealthyThreshold,
		unhealthyThreshold: config.UnhealthyThreshold,
		ctx:                ctx,
		cancel:             cancel,
		pluginHealth:       make(map[string]*PluginHealthData),
	}

	// Set defaults if not provided
	if hc.checkInterval == 0 {
		hc.checkInterval = 30 * time.Second
	}
	if hc.checkTimeout == 0 {
		hc.checkTimeout = 5 * time.Second
	}
	if hc.healthyThreshold == 0 {
		hc.healthyThreshold = 2
	}
	if hc.unhealthyThreshold == 0 {
		hc.unhealthyThreshold = 3
	}

	return hc
}

// SetRegistry sets the plugin registry for health checking
func (hc *HealthChecker) SetRegistry(registry *EnhancedPluginRegistry) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()
	hc.registry = registry
}

// Start begins the health checking process
func (hc *HealthChecker) Start() {
	if hc.registry == nil {
		log.Printf("Warning: Health checker started without registry")
		return
	}

	log.Printf("🏥 Starting health checker (interval: %v, timeout: %v)", hc.checkInterval, hc.checkTimeout)

	ticker := time.NewTicker(hc.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-hc.ctx.Done():
			log.Printf("🏥 Health checker stopped")
			return
		case <-ticker.C:
			hc.performHealthChecks()
		}
	}
}

// Stop stops the health checking process
func (hc *HealthChecker) Stop() {
	hc.cancel()
}

// CheckPluginHealth performs a manual health check for a specific plugin
func (hc *HealthChecker) CheckPluginHealth(pluginID string) (string, error) {
	if hc.registry == nil {
		return HealthUnknown, fmt.Errorf("health checker not initialized with registry")
	}

	plugin, exists := hc.registry.Get(pluginID)
	if !exists {
		return HealthUnknown, fmt.Errorf("plugin %s not found", pluginID)
	}

	// Create context with timeout for health check
	ctx, cancel := context.WithTimeout(context.Background(), hc.checkTimeout)
	defer cancel()

	// Perform health check
	healthStatus, err := hc.performSingleHealthCheck(ctx, pluginID, plugin)

	// Update health data
	hc.updateHealthData(pluginID, err)

	// Update registry health status
	hc.registry.UpdateHealth(pluginID, healthStatus)

	return healthStatus, err
}

// GetHealthData returns health monitoring data for a plugin
func (hc *HealthChecker) GetHealthData(pluginID string) (*PluginHealthData, bool) {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	data, exists := hc.pluginHealth[pluginID]
	if !exists {
		return nil, false
	}

	// Return a copy to avoid race conditions
	return &PluginHealthData{
		consecutiveFailures:  data.consecutiveFailures,
		consecutiveSuccesses: data.consecutiveSuccesses,
		lastCheckTime:        data.lastCheckTime,
		lastError:            data.lastError,
		totalChecks:          data.totalChecks,
		totalFailures:        data.totalFailures,
	}, true
}

// GetAllHealthData returns health data for all monitored plugins
func (hc *HealthChecker) GetAllHealthData() map[string]*PluginHealthData {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	result := make(map[string]*PluginHealthData)
	for pluginID, data := range hc.pluginHealth {
		result[pluginID] = &PluginHealthData{
			consecutiveFailures:  data.consecutiveFailures,
			consecutiveSuccesses: data.consecutiveSuccesses,
			lastCheckTime:        data.lastCheckTime,
			lastError:            data.lastError,
			totalChecks:          data.totalChecks,
			totalFailures:        data.totalFailures,
		}
	}

	return result
}

// RemovePluginHealth removes health monitoring data for a plugin
func (hc *HealthChecker) RemovePluginHealth(pluginID string) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	delete(hc.pluginHealth, pluginID)
}

// GetHealthSummary returns a summary of overall plugin health
func (hc *HealthChecker) GetHealthSummary() map[string]interface{} {
	hc.mutex.RLock()
	defer hc.mutex.RUnlock()

	summary := map[string]interface{}{
		"total_plugins":     len(hc.pluginHealth),
		"healthy_plugins":   0,
		"unhealthy_plugins": 0,
		"unknown_plugins":   0,
		"degraded_plugins":  0,
		"last_check_time":   time.Now().Format(time.RFC3339),
	}

	if hc.registry != nil {
		for pluginID := range hc.pluginHealth {
			if status, exists := hc.registry.GetStatus(pluginID); exists {
				switch status.Health {
				case HealthHealthy:
					summary["healthy_plugins"] = summary["healthy_plugins"].(int) + 1
				case HealthUnhealthy:
					summary["unhealthy_plugins"] = summary["unhealthy_plugins"].(int) + 1
				case HealthDegraded:
					summary["degraded_plugins"] = summary["degraded_plugins"].(int) + 1
				default:
					summary["unknown_plugins"] = summary["unknown_plugins"].(int) + 1
				}
			}
		}
	}

	return summary
}

// Private methods

func (hc *HealthChecker) performHealthChecks() {
	if hc.registry == nil {
		return
	}

	plugins := hc.registry.List()
	if len(plugins) == 0 {
		return
	}

	log.Printf("🏥 Performing health checks for %d plugins", len(plugins))

	var wg sync.WaitGroup
	for pluginID, plugin := range plugins {
		wg.Add(1)
		go func(id string, p KubestellarPlugin) {
			defer wg.Done()
			hc.checkPluginHealthAsync(id, p)
		}(pluginID, plugin)
	}

	wg.Wait()
	log.Printf("🏥 Completed health checks for %d plugins", len(plugins))
}

func (hc *HealthChecker) checkPluginHealthAsync(pluginID string, plugin KubestellarPlugin) {
	ctx, cancel := context.WithTimeout(context.Background(), hc.checkTimeout)
	defer cancel()

	healthStatus, err := hc.performSingleHealthCheck(ctx, pluginID, plugin)

	// Update health data
	hc.updateHealthData(pluginID, err)

	// Update registry health status
	if hc.registry != nil {
		hc.registry.UpdateHealth(pluginID, healthStatus)
	}

	if err != nil {
		log.Printf("🏥 Plugin %s health check failed: %v", pluginID, err)
	} else {
		log.Printf("🏥 Plugin %s health check passed: %s", pluginID, healthStatus)
	}
}

func (hc *HealthChecker) performSingleHealthCheck(ctx context.Context, pluginID string, plugin KubestellarPlugin) (string, error) {
	// Create a channel to receive the health check result
	healthChan := make(chan error, 1)

	// Perform health check in a goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				healthChan <- fmt.Errorf("health check panicked: %v", r)
			}
		}()

		err := plugin.Health()
		healthChan <- err
	}()

	// Wait for either completion or timeout
	select {
	case <-ctx.Done():
		return HealthUnhealthy, fmt.Errorf("health check timed out after %v", hc.checkTimeout)
	case err := <-healthChan:
		if err != nil {
			return hc.determineHealthStatus(pluginID, err), err
		}
		return hc.determineHealthStatus(pluginID, nil), nil
	}
}

func (hc *HealthChecker) determineHealthStatus(pluginID string, err error) string {
	hc.mutex.RLock()
	data, exists := hc.pluginHealth[pluginID]
	hc.mutex.RUnlock()

	if !exists {
		if err != nil {
			return HealthUnhealthy
		}
		return HealthHealthy
	}

	if err != nil {
		// Health check failed
		if data.consecutiveFailures >= hc.unhealthyThreshold {
			return HealthUnhealthy
		} else if data.consecutiveFailures > 0 {
			return HealthDegraded
		}
		return HealthDegraded
	} else {
		// Health check passed
		if data.consecutiveSuccesses >= hc.healthyThreshold {
			return HealthHealthy
		} else if data.consecutiveFailures > 0 {
			return HealthDegraded
		}
		return HealthHealthy
	}
}

func (hc *HealthChecker) updateHealthData(pluginID string, err error) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	data, exists := hc.pluginHealth[pluginID]
	if !exists {
		data = &PluginHealthData{}
		hc.pluginHealth[pluginID] = data
	}

	data.lastCheckTime = time.Now()
	data.totalChecks++

	if err != nil {
		data.consecutiveFailures++
		data.consecutiveSuccesses = 0
		data.lastError = err
		data.totalFailures++
	} else {
		data.consecutiveSuccesses++
		data.consecutiveFailures = 0
		data.lastError = nil
	}
}

// AddPlugin adds a plugin to health monitoring
func (hc *HealthChecker) AddPlugin(pluginID string) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	if _, exists := hc.pluginHealth[pluginID]; !exists {
		hc.pluginHealth[pluginID] = &PluginHealthData{
			lastCheckTime: time.Now(),
		}
		log.Printf("🏥 Added plugin %s to health monitoring", pluginID)
	}
}

// RemovePlugin removes a plugin from health monitoring
func (hc *HealthChecker) RemovePlugin(pluginID string) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	if _, exists := hc.pluginHealth[pluginID]; exists {
		delete(hc.pluginHealth, pluginID)
		log.Printf("🏥 Removed plugin %s from health monitoring", pluginID)
	}
}

// UpdateConfiguration updates the health checker configuration
func (hc *HealthChecker) UpdateConfiguration(config HealthCheckConfig) {
	hc.mutex.Lock()
	defer hc.mutex.Unlock()

	if config.CheckInterval > 0 {
		hc.checkInterval = config.CheckInterval
	}
	if config.CheckTimeout > 0 {
		hc.checkTimeout = config.CheckTimeout
	}
	if config.HealthyThreshold > 0 {
		hc.healthyThreshold = config.HealthyThreshold
	}
	if config.UnhealthyThreshold > 0 {
		hc.unhealthyThreshold = config.UnhealthyThreshold
	}

	log.Printf("🏥 Updated health checker configuration: interval=%v, timeout=%v, healthy_threshold=%d, unhealthy_threshold=%d",
		hc.checkInterval, hc.checkTimeout, hc.healthyThreshold, hc.unhealthyThreshold)
}
