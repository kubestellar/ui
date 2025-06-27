package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/health"
	"go.uber.org/zap"
)

// Replace the simple health endpoint in main.go with:
func setupHealthEndpoints(router *gin.Engine, logger *zap.Logger) {
	// Comprehensive health check
	router.GET("/health", health.HealthHandler(logger))

	// Kubernetes-style probes
	router.GET("/healthz", health.LivenessHandler()) // Liveness probe
	router.GET("/readyz", health.ReadinessHandler()) // Readiness probe

	// Simple status endpoint
	router.GET("/status", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"service": "kubestellar-ui",
			"status":  "running",
			"version": "1.0.0",
		})
	})
}
