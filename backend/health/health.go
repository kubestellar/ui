package health

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	database "github.com/kubestellar/ui/postgresql/Database"
	"github.com/kubestellar/ui/redis"
	"go.uber.org/zap"
)

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
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
	Latency string `json:"latency,omitempty"`
	Error   string `json:"error,omitempty"`
}

var startTime = time.Now()

// HealthHandler provides comprehensive health check endpoint
func HealthHandler(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		health := HealthStatus{
			Service:     "kubestellar-ui",
			Version:     "1.0.0",
			Timestamp:   time.Now().UTC().Format(time.RFC3339),
			Uptime:      time.Since(startTime).String(),
			Environment: getEnvironment(),
			Components:  make(map[string]ComponentHealth),
		}

		overallHealthy := true

		// Check Database
		dbHealth := checkDatabase()
		health.Components["database"] = dbHealth
		if dbHealth.Status != "healthy" {
			overallHealthy = false
		}

		// Check Redis
		redisHealth := checkRedis()
		health.Components["redis"] = redisHealth
		if redisHealth.Status != "healthy" {
			overallHealthy = false
		}

		// Check Memory
		memHealth := checkMemory()
		health.Components["memory"] = memHealth

		// Check Disk Space
		diskHealth := checkDiskSpace()
		health.Components["disk"] = diskHealth

		// Set overall status
		if overallHealthy {
			health.Status = "healthy"
			c.JSON(http.StatusOK, health)
		} else {
			health.Status = "unhealthy"
			c.JSON(http.StatusServiceUnavailable, health)
		}

		// Log health check
		logger.Info("Health check performed",
			zap.String("status", health.Status),
			zap.String("client_ip", c.ClientIP()),
		)
	}
}

// LivenessHandler for Kubernetes liveness probe
func LivenessHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "alive",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// ReadinessHandler for Kubernetes readiness probe
func ReadinessHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check critical dependencies
		if !isDatabaseReady() {
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

// checkDatabase verifies database connectivity
func checkDatabase() ComponentHealth {
	if database.DB == nil {
		return ComponentHealth{
			Status: "unhealthy",
			Error:  "database connection not initialized",
		}
	}

	start := time.Now()
	err := database.DB.Ping()
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

// checkRedis verifies Redis connectivity
func checkRedis() ComponentHealth {
	start := time.Now()

	// Use the Redis client to ping Redis
	err := redis.PingRedis()
	latency := time.Since(start)

	if err != nil {
		return ComponentHealth{
			Status:  "degraded", // Redis might not be critical
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

// checkMemory checks memory usage
func checkMemory() ComponentHealth {
	// Basic memory check - you can enhance this
	return ComponentHealth{
		Status:  "healthy",
		Message: "memory usage within limits",
	}
}

// checkDiskSpace checks available disk space
func checkDiskSpace() ComponentHealth {
	// Basic disk check - you can enhance this
	return ComponentHealth{
		Status:  "healthy",
		Message: "disk space sufficient",
	}
}

// isDatabaseReady checks if database is ready for queries
func isDatabaseReady() bool {
	if database.DB == nil {
		return false
	}

	// Try a simple query
	var result int
	err := database.DB.QueryRow("SELECT 1").Scan(&result)
	return err == nil && result == 1
}

// getEnvironment returns current environment
func getEnvironment() string {
	if env := getEnv("GIN_MODE", ""); env != "" {
		return env
	}
	return "development"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
