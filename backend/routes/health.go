package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/health"
	"go.uber.org/zap"
)

// HealthEndpointConfig holds configuration for health endpoints
type HealthEndpointConfig struct {
	HealthPath    string
	LivenessPath  string
	ReadinessPath string
	EnableMetrics bool
	HealthConfig  *health.HealthConfig
}

// getDefaultHealthEndpointConfig returns default configuration for health endpoints
func getDefaultHealthEndpointConfig() *HealthEndpointConfig {
	return &HealthEndpointConfig{
		HealthPath:    "/health",
		LivenessPath:  "/healthz",
		ReadinessPath: "/readyz",
		EnableMetrics: true,
		HealthConfig:  nil, // Will use default health config
	}
}

// SetupHealthEndpoints sets up health endpoints with default configuration
func SetupHealthEndpoints(router *gin.Engine, logger *zap.Logger) {
	SetupHealthEndpointsWithConfig(router, logger, nil)
}

// SetupHealthEndpointsWithConfig sets up health endpoints with custom configuration
func SetupHealthEndpointsWithConfig(router *gin.Engine, logger *zap.Logger, config *HealthEndpointConfig) {
	if config == nil {
		config = getDefaultHealthEndpointConfig()
	}

	// Create health checker instance
	healthChecker := health.NewHealthChecker(logger, config.HealthConfig)

	// Setup health endpoint group for better organization
	healthGroup := router.Group("")

	// Apply middleware if needed (optional)
	if config.EnableMetrics {
		healthGroup.Use(healthMetricsMiddleware(logger))
	}

	// Comprehensive health check
	healthGroup.GET(config.HealthPath, healthChecker.HealthHandler())

	// Kubernetes probes
	healthGroup.GET(config.LivenessPath, healthChecker.LivenessHandler())   // Liveness probe
	healthGroup.GET(config.ReadinessPath, healthChecker.ReadinessHandler()) // Readiness probe

	// Additional health endpoints for monitoring
	healthGroup.GET("/health/detailed", healthChecker.HealthHandler()) // Alias for detailed health

	logger.Info("Health endpoints configured",
		zap.String("health_path", config.HealthPath),
		zap.String("liveness_path", config.LivenessPath),
		zap.String("readiness_path", config.ReadinessPath),
		zap.Bool("metrics_enabled", config.EnableMetrics))
}

// healthMetricsMiddleware adds basic metrics and logging for health endpoints
func healthMetricsMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Log health endpoint access for monitoring
		if param.Path == "/health" || param.Path == "/healthz" || param.Path == "/readyz" {
			logger.Debug("Health endpoint accessed",
				zap.String("method", param.Method),
				zap.String("path", param.Path),
				zap.Int("status", param.StatusCode),
				zap.Duration("latency", param.Latency),
				zap.String("client_ip", param.ClientIP),
				zap.String("user_agent", param.Request.UserAgent()))
		}
		return ""
	})
}

// SetupCustomHealthEndpoints allows for completely custom health endpoint setup
func SetupCustomHealthEndpoints(router *gin.Engine, logger *zap.Logger, healthChecker *health.HealthChecker, paths map[string]string) {
	if healthChecker == nil {
		logger.Error("Health checker cannot be nil")
		return
	}

	// Default paths if not provided
	if paths == nil {
		paths = map[string]string{
			"health":    "/health",
			"liveness":  "/healthz",
			"readiness": "/readyz",
		}
	}

	// Setup endpoints with custom paths
	if healthPath, exists := paths["health"]; exists {
		router.GET(healthPath, healthChecker.HealthHandler())
	}

	if livenessPath, exists := paths["liveness"]; exists {
		router.GET(livenessPath, healthChecker.LivenessHandler())
	}

	if readinessPath, exists := paths["readiness"]; exists {
		router.GET(readinessPath, healthChecker.ReadinessHandler())
	}

	logger.Info("Custom health endpoints configured", zap.Any("paths", paths))
}

// Usage examples:

// Example 1: Default setup (backward compatible)
// routes.SetupHealthEndpoints(router, logger)

// Example 2: Custom configuration
// config := &routes.HealthEndpointConfig{
//     HealthPath:    "/api/health",
//     LivenessPath:  "/api/live",
//     ReadinessPath: "/api/ready",
//     EnableMetrics: true,
//     HealthConfig: &health.HealthConfig{
//         ServiceName: "my-service",
//         DatabaseTimeout: 10 * time.Second,
//     },
// }
// routes.SetupHealthEndpointsWithConfig(router, logger, config)

// Example 3: Completely custom setup
// healthChecker := health.NewHealthChecker(logger, customHealthConfig)
// customPaths := map[string]string{
//     "health":    "/status",
//     "liveness":  "/ping",
//     "readiness": "/ready",
// }
// routes.SetupCustomHealthEndpoints(router, logger, healthChecker, customPaths)
