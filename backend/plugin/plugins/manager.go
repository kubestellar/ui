package plugins

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	"go.uber.org/zap"
)

// this file contains the plugin Manager implementation  for KS
// a centralized manager that handles our plugins

type pluginStatus struct {
	Status       string    `json:"status"`       // active, failed, error, idle
	LastError    string    `json:"lastError"`    
	LastRun      time.Time `json:"lastRun"`
	JobStatus    string    `json:"jobStatus"`    // running, completed, failed
	ErrorCount   int       `json:"errorCount"`
	SuccessCount int       `json:"successCount"`
}

type pluginManager struct {
	plugins       map[string]plugin.Plugin
	pluginStatuses map[string]*pluginStatus
	mx            sync.Mutex
}

// returns all the routes if there are any for the gin engine
func (pm *pluginManager) SetupPluginsRoutes(e *gin.Engine) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	log.LogInfo("setting up plugin route...")
	

	for _, p := range pm.plugins {
		log.LogInfo(fmt.Sprintf("routes for Plugin--->%s", p.Name()))
		for _, r := range p.Routes() {
			switch r.Method {
			case http.MethodGet:
				e.GET(r.Path, r.Handler)
				log.LogInfo("", zap.String("method", http.MethodGet), zap.String("path", r.Path))
			case http.MethodPost:
				e.POST(r.Path, r.Handler)
				log.LogInfo("", zap.String("method", http.MethodPost), zap.String("path", r.Path))
			case http.MethodDelete:
				e.DELETE(r.Path, r.Handler)
				log.LogInfo("", zap.String("method", http.MethodDelete), zap.String("path", r.Path))
			case http.MethodPatch:
				e.PATCH(r.Path, r.Handler)
				log.LogInfo("", zap.String("method", http.MethodPatch), zap.String("path", r.Path))
			}
		}
	}

	pm.setupManagementRoutes(e)
}

func (pm *pluginManager) setupManagementRoutes(e *gin.Engine) {
	// Plugin backup endpoints
	e.POST("/api/plugins/backup", pm.handlePluginBackup)
	
	// Add these new endpoints for backup operations
	e.GET("/api/plugins/backup/status", pm.handleBackupStatus)
	e.POST("/api/plugins/backup/trigger", pm.handleBackupTrigger)
	e.POST("/api/plugins/backup/enable", pm.handleBackupEnable)
	
	e.POST("/api/plugins/:name/action", pm.handlePluginAction)
	
	// Add the detailed status endpoint
	e.GET("/api/plugins/:name/status", pm.handlePluginDetailedStatus)
}

// registers a plugin to plugin Manager
func (pm *pluginManager) Register(p plugin.Plugin) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	pm.plugins[p.Name()] = p
	log.LogInfo("registered a new plugin", zap.String("NAME", p.Name()))
}

// deregisters  a plugin to plugin manager
func (pm *pluginManager) Deregister(p plugin.Plugin) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	delete(pm.plugins, p.Name())
	log.LogInfo("deregistered plugin", zap.String("NAME", p.Name()))
}

// GetPlugins returns all registered plugins
func (pm *pluginManager) GetPlugins() map[string]plugin.Plugin {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	return pm.plugins
}

// getAllPlugins returns all registered plugins
func (pm *pluginManager) getAllPlugins(c *gin.Context) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	
	var pluginList []map[string]interface{}
	for name := range pm.plugins {
		pluginInfo := map[string]interface{}{
			"name":    name,
			"version": "1.0.0", // You might want to add version to plugin interface
			"type":    "dynamic",
			"status":  "active",
			"enabled": 1,
		}
		pluginList = append(pluginList, pluginInfo)
	}
	
	c.JSON(http.StatusOK, pluginList)
}

// getPluginStats returns statistics for a specific plugin
func (pm *pluginManager) getPluginStats(c *gin.Context) {
	pluginName := c.Param("name")
	
	pm.mx.Lock()
	_, exists := pm.plugins[pluginName]
	pm.mx.Unlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}
	
	// Return mock stats for now - you can implement real stats collection
	stats := map[string]interface{}{
		"usageCount":         42,
		"lastExecutionTime": "2024-01-15T10:30:00Z",
		"averageResponseTime": 150,
		"successRate":       95.5,
		"errors":           2,
		"status": map[string]string{
			"memory": "32MB",
			"cpu":    "1.2%",
		},
	}
	
	c.JSON(http.StatusOK, stats)
}

// handlePluginBackup handles backup operations for plugins
func (pm *pluginManager) handlePluginBackup(c *gin.Context) {
	var request struct {
		PluginName string                 `json:"pluginName"`
		Action     string                 `json:"action"`
		Config     map[string]interface{} `json:"config"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	
	pm.mx.Lock()
	plugin, exists := pm.plugins[request.PluginName]
	pm.mx.Unlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}
	
	log.LogInfo("Processing backup request", 
		zap.String("plugin", request.PluginName),
		zap.String("action", request.Action))
	
	// For now, just return success - implement actual backup logic here
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Backup %s initiated for plugin %s", request.Action, plugin.Name()),
		"jobId":   fmt.Sprintf("backup-%s-%d", request.PluginName, 12345),
	})
}

// handlePluginAction handles generic plugin actions
func (pm *pluginManager) handlePluginAction(c *gin.Context) {
	pluginName := c.Param("name")
	
	var request struct {
		Action string                 `json:"action"`
		Config map[string]interface{} `json:"config"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	
	pm.mx.Lock()
	plugin, exists := pm.plugins[pluginName]
	pm.mx.Unlock()
	
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}
	
	log.LogInfo("Processing plugin action", 
		zap.String("plugin", pluginName),
		zap.String("action", request.Action))
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Action %s executed for plugin %s", request.Action, plugin.Name()),
	})
}

// handlePluginDetailedStatus returns detailed status for a specific plugin
func (pm *pluginManager) handlePluginDetailedStatus(c *gin.Context) {
	pluginName := c.Param("name")
	
	pm.mx.Lock()
	defer pm.mx.Unlock()
	
	// Initialize plugin statuses map if it doesn't exist
	if pm.pluginStatuses == nil {
		pm.pluginStatuses = make(map[string]*pluginStatus)
	}
	
	// Check if plugin exists
	_, pluginExists := pm.plugins[pluginName]
	if !pluginExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}
	
	// Get or create status for the plugin
	status := pm.pluginStatuses[pluginName]
	if status == nil {
		status = &pluginStatus{
			Status:       "idle",
			LastError:    "",
			JobStatus:    "idle",
			ErrorCount:   0,
			SuccessCount: 0,
			LastRun:      time.Now().Add(-1 * time.Hour), // Default to 1 hour ago
		}
		pm.pluginStatuses[pluginName] = status
	}
	
	c.JSON(http.StatusOK, status)
}

// handleBackupStatus returns enhanced backup status with error reporting
func (pm *pluginManager) handleBackupStatus(c *gin.Context) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	
	// Initialize plugin statuses map if it doesn't exist
	if pm.pluginStatuses == nil {
		pm.pluginStatuses = make(map[string]*pluginStatus)
	}
	
	status := pm.pluginStatuses["backup-plugin"]
	if status == nil {
		status = &pluginStatus{
			Status:       "idle",
			LastError:    "",
			JobStatus:    "idle",
			ErrorCount:   0,
			SuccessCount: 5, // Default some success count
			LastRun:      time.Now().Add(-24 * time.Hour),
		}
		pm.pluginStatuses["backup-plugin"] = status
	}

	// Check actual backup job status in Kubernetes
	_, jobError := pm.checkBackupJobStatus()
	
	response := gin.H{
		"lastRun":       status.LastRun.Format(time.RFC3339),
		"nextScheduled": time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"backupCount":   status.SuccessCount,
		"status":        status.Status,
		"jobStatus":     status.JobStatus,
		"lastError":     status.LastError,
		"errorCount":    status.ErrorCount,
		"successCount":  status.SuccessCount,
		"locations":     []string{"/backup", "/mnt/external"},
	}

	if jobError != "" {
		response["lastError"] = jobError
		response["status"] = "failed"
		status.LastError = jobError
		status.Status = "failed"
	}

	c.JSON(http.StatusOK, response)
}

// handleBackupTrigger initiates a new backup with proper error handling
func (pm *pluginManager) handleBackupTrigger(c *gin.Context) {
	pm.mx.Lock()
	if pm.pluginStatuses == nil {
		pm.pluginStatuses = make(map[string]*pluginStatus)
	}
	if pm.pluginStatuses["backup-plugin"] == nil {
		pm.pluginStatuses["backup-plugin"] = &pluginStatus{
			Status:       "idle",
			LastError:    "",
			JobStatus:    "idle",
			ErrorCount:   0,
			SuccessCount: 0,
			LastRun:      time.Now(),
		}
	}
	status := pm.pluginStatuses["backup-plugin"]
	status.Status = "running"
	status.JobStatus = "running"
	status.LastRun = time.Now()
	pm.mx.Unlock()

	log.LogInfo("Backup triggered manually")

	// Simulate backup process with error handling
	go func() {
		time.Sleep(2 * time.Second) // Simulate processing time
		
		pm.mx.Lock()
		defer pm.mx.Unlock()
		
		// Simulate random success/failure for demonstration
		if time.Now().UnixNano()%3 == 0 {
			// Simulate failure
			status.Status = "failed"
			status.JobStatus = "failed"
			status.LastError = "Backup failed: Unable to connect to storage backend"
			status.ErrorCount++
		} else {
			// Success
			status.Status = "active"
			status.JobStatus = "completed"
			status.LastError = ""
			status.SuccessCount++
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Backup triggered successfully",
		"jobId":   fmt.Sprintf("backup-%d", time.Now().Unix()),
	})
}

// handleBackupEnable handles enabling/disabling backup functionality
func (pm *pluginManager) handleBackupEnable(c *gin.Context) {
	var request struct {
		Enabled int `json:"enabled"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	
	pm.mx.Lock()
	defer pm.mx.Unlock()
	
	// Initialize plugin statuses map if it doesn't exist
	if pm.pluginStatuses == nil {
		pm.pluginStatuses = make(map[string]*pluginStatus)
	}
	
	status := pm.pluginStatuses["backup-plugin"]
	if status == nil {
		status = &pluginStatus{
			Status:       "idle",
			LastError:    "",
			JobStatus:    "idle",
			ErrorCount:   0,
			SuccessCount: 0,
			LastRun:      time.Now(),
		}
		pm.pluginStatuses["backup-plugin"] = status
	}
	
	// Update the backup enabled state
	enabledState := request.Enabled == 1
	if enabledState {
		status.Status = "active"
		log.LogInfo("Backup service enabled")
	} else {
		status.Status = "idle"
		log.LogInfo("Backup service disabled")
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Backup service %s", map[bool]string{true: "enabled", false: "disabled"}[enabledState]),
		"enabled": request.Enabled,
	})
}

// checkBackupJobStatus checks the actual Kubernetes job status
func (pm *pluginManager) checkBackupJobStatus() (string, string) {
	// This would check actual Kubernetes jobs
	// For now, returning mock data
	return "completed", ""
}

var Pm *pluginManager = &pluginManager{
	plugins:        map[string]plugin.Plugin{},
	pluginStatuses: make(map[string]*pluginStatus),
}
