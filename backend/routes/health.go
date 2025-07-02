package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/health"
	"go.uber.org/zap"
)

func SetupHealthEndpoints(router *gin.Engine, logger *zap.Logger) {
	// Comprehensive health check
	router.GET("/health", health.HealthHandler(logger))

	// Liveness and Readiness probes
	router.GET("/healthz", health.LivenessHandler()) // Liveness probe
	router.GET("/readyz", health.ReadinessHandler()) // Readiness probe

}
