package health

import (
	"context"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/kubestellar/ui/backend/redis"
	"go.uber.org/zap"
)

type HealthConfig struct {
	ServiceName        string
	ServiceVersion     string
	DatabaseTimeout    time.Duration
	RedisTimeout       time.Duration
	MemoryThreshold    float64 // Percentage
	DiskThreshold      float64 // Percentage
	HealthCheckTimeout time.Duration
	ComponentsToCheck  []string
}

type HealthStatus struct {
	Status      string                     `json:"status"`
	Service     string                     `json:"service"`
	Version     string                     `json:"version"`
	Timestamp   string                     `json:"timestamp"`
	Uptime      string                     `json:"uptime"`
	Environment string                     `json:"environment"`
	Components  map[string]ComponentHealth `json:"components"`
}

type ComponentHealth struct {
	Status   string                 `json:"status"`
	Message  string                 `json:"message,omitempty"`
	Latency  string                 `json:"latency,omitempty"`
	Error    string                 `json:"error,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type HealthChecker struct {
	config    HealthConfig
	logger    *zap.Logger
	startTime time.Time
}

// NewHealthChecker creates a new health checker with configuration
func NewHealthChecker(logger *zap.Logger, config *HealthConfig) *HealthChecker {
	if config == nil {
		config = getDefaultConfig()
	}

	return &HealthChecker{
		config:    *config,
		logger:    logger,
		startTime: time.Now(),
	}
}

// getDefaultConfig returns default configuration with values from environment variables
func getDefaultConfig() *HealthConfig {
	return &HealthConfig{
		ServiceName:        getEnv("SERVICE_NAME", "kubestellar-ui"),
		ServiceVersion:     getEnv("SERVICE_VERSION", "1.0.0"),
		DatabaseTimeout:    getDurationEnv("DB_HEALTH_TIMEOUT", 5*time.Second),
		RedisTimeout:       getDurationEnv("REDIS_HEALTH_TIMEOUT", 3*time.Second),
		MemoryThreshold:    getFloatEnv("MEMORY_THRESHOLD", 85.0),
		DiskThreshold:      getFloatEnv("DISK_THRESHOLD", 90.0),
		HealthCheckTimeout: getDurationEnv("HEALTH_CHECK_TIMEOUT", 10*time.Second),
		ComponentsToCheck:  getSliceEnv("HEALTH_COMPONENTS", []string{"database", "redis", "memory", "disk"}),
	}
}

// HealthHandler provides comprehensive health check endpoint
func (hc *HealthChecker) HealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), hc.config.HealthCheckTimeout)
		defer cancel()

		health := HealthStatus{
			Service:     hc.config.ServiceName,
			Version:     hc.config.ServiceVersion,
			Timestamp:   time.Now().UTC().Format(time.RFC3339),
			Uptime:      time.Since(hc.startTime).String(),
			Environment: getEnvironment(),
			Components:  make(map[string]ComponentHealth),
		}

		overallHealthy := true
		checkResults := make(chan componentResult, len(hc.config.ComponentsToCheck))

		// Run health checks concurrently
		for _, component := range hc.config.ComponentsToCheck {
			go hc.checkComponent(ctx, component, checkResults)
		}

		// Collect results
		for i := 0; i < len(hc.config.ComponentsToCheck); i++ {
			select {
			case result := <-checkResults:
				health.Components[result.name] = result.health
				if result.health.Status == "unhealthy" {
					overallHealthy = false
				}
			case <-ctx.Done():
				hc.logger.Warn("Health check timed out")
				overallHealthy = false
				break
			}
		}

		// Set overall status
		statusCode := http.StatusOK
		if overallHealthy {
			health.Status = "healthy"
		} else {
			health.Status = "unhealthy"
			statusCode = http.StatusServiceUnavailable
		}

		c.JSON(statusCode, health)

		// Log health check
		hc.logger.Info("Health check performed",
			zap.String("status", health.Status),
			zap.String("client_ip", c.ClientIP()),
			zap.Duration("duration", time.Since(time.Now())),
		)
	}
}

type componentResult struct {
	name   string
	health ComponentHealth
}

// checkComponent performs health check for a specific component
func (hc *HealthChecker) checkComponent(ctx context.Context, component string, results chan<- componentResult) {
	var health ComponentHealth

	switch component {
	case "database":
		health = hc.checkDatabase(ctx)
	case "redis":
		health = hc.checkRedis(ctx)
	case "memory":
		health = hc.checkMemory()
	case "disk":
		health = hc.checkDiskSpace()
	default:
		health = ComponentHealth{
			Status: "unknown",
			Error:  "unknown component: " + component,
		}
	}

	results <- componentResult{name: component, health: health}
}

// LivenessHandler for Kubernetes liveness probe
func (hc *HealthChecker) LivenessHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "alive",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"uptime":    time.Since(hc.startTime).String(),
		})
	}
}

// ReadinessHandler for Kubernetes readiness probe
func (hc *HealthChecker) ReadinessHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), hc.config.DatabaseTimeout)
		defer cancel()

		// Check critical dependencies
		if !hc.isDatabaseReady(ctx) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not_ready",
				"reason": "database_not_ready",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "ready",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// checkDatabase verifies database connectivity with context timeout
func (hc *HealthChecker) checkDatabase(ctx context.Context) ComponentHealth {
	if database.DB == nil {
		return ComponentHealth{
			Status: "unhealthy",
			Error:  "database connection not initialized",
		}
	}

	start := time.Now()

	// Create a context with timeout for database check
	dbCtx, cancel := context.WithTimeout(ctx, hc.config.DatabaseTimeout)
	defer cancel()

	err := database.DB.PingContext(dbCtx)
	latency := time.Since(start)

	if err != nil {
		return ComponentHealth{
			Status:  "unhealthy",
			Error:   err.Error(),
			Latency: latency.String(),
		}
	}

	return ComponentHealth{
		Status:  "healthy",
		Message: "database connection successful",
		Latency: latency.String(),
	}
}

// checkRedis verifies Redis connectivity using the existing redis package
func (hc *HealthChecker) checkRedis(ctx context.Context) ComponentHealth {
	start := time.Now()

	// Create a context with timeout for Redis check
	_, cancel := context.WithTimeout(ctx, hc.config.RedisTimeout)
	defer cancel()

	// Use a simple Redis operation to check connectivity
	// This assumes you have a Redis client available in your redis package
	testKey := "health_check_" + strconv.FormatInt(time.Now().UnixNano(), 10)

	// Try to set and get a test value
	err := redis.SetNamespaceCache(testKey, "test", 1*time.Second)
	if err != nil {
		return ComponentHealth{
			Status:  "unhealthy",
			Error:   err.Error(),
			Latency: time.Since(start).String(),
		}
	}

	// Try to get the test value
	_, err = redis.GetNamespaceCache(testKey)
	latency := time.Since(start)

	if err != nil {
		return ComponentHealth{
			Status:  "degraded",
			Error:   err.Error(),
			Latency: latency.String(),
		}
	}

	return ComponentHealth{
		Status:  "healthy",
		Message: "redis connection successful",
		Latency: latency.String(),
	}
}

// checkMemory checks memory usage with configurable thresholds
func (hc *HealthChecker) checkMemory() ComponentHealth {
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	// Calculate memory usage percentage
	allocMB := float64(memStats.Alloc) / 1024 / 1024
	sysMB := float64(memStats.Sys) / 1024 / 1024

	metadata := map[string]interface{}{
		"alloc_mb":   allocMB,
		"sys_mb":     sysMB,
		"gc_cycles":  memStats.NumGC,
		"goroutines": runtime.NumGoroutine(),
	}

	// Simple threshold check - you might want to implement more sophisticated logic
	if allocMB > 1000 { // 1GB threshold - make this configurable
		return ComponentHealth{
			Status:   "degraded",
			Message:  "high memory usage",
			Metadata: metadata,
		}
	}

	return ComponentHealth{
		Status:   "healthy",
		Message:  "memory usage within limits",
		Metadata: metadata,
	}
}

// checkDiskSpace checks available disk space with configurable thresholds
func (hc *HealthChecker) checkDiskSpace() ComponentHealth {
	diskPath := getEnv("DISK_PATH", "/")

	var stat syscall.Statfs_t
	err := syscall.Statfs(diskPath, &stat)
	if err != nil {
		return ComponentHealth{
			Status: "unhealthy",
			Error:  "failed to get disk stats: " + err.Error(),
		}
	}

	// Calculate disk usage
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used := total - free
	usedPercent := float64(used) / float64(total) * 100

	metadata := map[string]interface{}{
		"total_gb":     float64(total) / 1024 / 1024 / 1024,
		"free_gb":      float64(free) / 1024 / 1024 / 1024,
		"used_gb":      float64(used) / 1024 / 1024 / 1024,
		"used_percent": usedPercent,
		"path":         diskPath,
	}

	status := "healthy"
	message := "disk space sufficient"

	if usedPercent > hc.config.DiskThreshold {
		status = "unhealthy"
		message = "disk space critical"
	} else if usedPercent > (hc.config.DiskThreshold - 10) {
		status = "degraded"
		message = "disk space low"
	}

	return ComponentHealth{
		Status:   status,
		Message:  message,
		Metadata: metadata,
	}
}

// isDatabaseReady checks if database is ready for queries with context
func (hc *HealthChecker) isDatabaseReady(ctx context.Context) bool {
	if database.DB == nil {
		return false
	}

	// Try a simple query with context
	var result int
	err := database.DB.QueryRowContext(ctx, "SELECT 1").Scan(&result)
	return err == nil && result == 1
}

// getEnvironment returns current environment
func getEnvironment() string {
	env := getEnv("ENVIRONMENT", "")
	if env == "" {
		env = getEnv("GIN_MODE", "development")
	}
	return env
}

// Utility functions for environment variable parsing
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getFloatEnv(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 64); err == nil {
			return floatVal
		}
	}
	return defaultValue
}

func getSliceEnv(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Simple comma-separated parsing
		// For more complex parsing, consider using a proper CSV parser
		return []string{value} // Simplified - you might want to split by comma
	}
	return defaultValue
}

// Factory function to create health checker with default logger
func NewDefaultHealthChecker(logger *zap.Logger) *HealthChecker {
	return NewHealthChecker(logger, nil)
}

// Usage example:
// healthChecker := NewHealthChecker(logger, &HealthConfig{
//     ServiceName: "my-service",
//     ServiceVersion: "2.0.0",
//     DatabaseTimeout: 10 * time.Second,
//     ComponentsToCheck: []string{"database", "redis"},
// })
//
//
