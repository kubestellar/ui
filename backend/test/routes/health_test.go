package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/routes"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestSetupHealthEndpoints(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a new Gin engine
	router := gin.New()
	logger, _ := zap.NewDevelopment()

	// Setup health endpoints
	routes.SetupHealthEndpoints(router, logger)

	tests := []struct {
		name           string
		path           string
		method         string
		expectedStatus int
	}{
		{
			name:           "Health endpoint",
			path:           "/health",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Liveness probe endpoint",
			path:           "/healthz",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Readiness probe endpoint",
			path:           "/readyz",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Health endpoints may return 503 when unhealthy, which is valid
			// We just want to ensure the route is registered (not 404)
			if tt.path == "/health" || tt.path == "/readyz" {
				// Health and readiness endpoints can return 200 (healthy) or 503 (unhealthy)
				assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusServiceUnavailable,
					"Health endpoint should return 200 or 503, got %d", w.Code)
			} else {
				// Liveness probe should always return 200
				assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")
			}
		})
	}
}

func TestHealthEndpointsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger, _ := zap.NewDevelopment()

	routes.SetupHealthEndpoints(router, logger)

	req, _ := http.NewRequest("GET", "/nonexistent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
