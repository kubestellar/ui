package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/health"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestSetupHealthEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Test default setup
	routes.SetupHealthEndpoints(router, logger)

	// Test that all default endpoints are registered
	testCases := []struct {
		name           string
		path           string
		expectedStatus int
	}{
		{
			name:           "Health endpoint",
			path:           "/health",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Liveness probe",
			path:           "/healthz",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Readiness probe",
			path:           "/readyz",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Detailed health endpoint",
			path:           "/health/detailed",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Health endpoints should return 200 or 503 (service unavailable)
			// depending on the health status, but never 404
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Health endpoint should be registered")
			assert.Contains(t, []int{http.StatusOK, http.StatusServiceUnavailable}, w.Code)
		})
	}
}

func TestSetupHealthEndpointsWithConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Test with custom configuration
	config := &routes.HealthEndpointConfig{
		HealthPath:    "/api/health",
		LivenessPath:  "/api/live",
		ReadinessPath: "/api/ready",
		EnableMetrics: true,
		HealthConfig: &health.HealthConfig{
			ServiceName:     "test-service",
			ServiceVersion:  "1.0.0",
			DatabaseTimeout: 5 * time.Second,
		},
	}

	routes.SetupHealthEndpointsWithConfig(router, logger, config)

	// Test custom endpoints
	testCases := []struct {
		name           string
		path           string
		expectedStatus int
	}{
		{
			name:           "Custom health endpoint",
			path:           "/api/health",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom liveness probe",
			path:           "/api/live",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom readiness probe",
			path:           "/api/ready",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom detailed health endpoint",
			path:           "/health/detailed",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Custom health endpoint should be registered")
			assert.Contains(t, []int{http.StatusOK, http.StatusServiceUnavailable}, w.Code)
		})
	}

	// Test that default endpoints are NOT registered
	defaultPaths := []string{"/health", "/healthz", "/readyz"}
	for _, path := range defaultPaths {
		t.Run("Default path not registered: "+path, func(t *testing.T) {
			req, err := http.NewRequest("GET", path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code, "Default path should not be registered when using custom config")
		})
	}
}

func TestSetupHealthEndpointsWithNilConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Test with nil config (should use defaults)
	routes.SetupHealthEndpointsWithConfig(router, logger, nil)

	// Verify default endpoints are registered
	testCases := []struct {
		name string
		path string
	}{
		{"Health endpoint", "/health"},
		{"Liveness probe", "/healthz"},
		{"Readiness probe", "/readyz"},
		{"Detailed health", "/health/detailed"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Default health endpoint should be registered")
		})
	}
}

func TestSetupCustomHealthEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Create a custom health checker
	healthConfig := &health.HealthConfig{
		ServiceName:    "custom-service",
		ServiceVersion: "2.0.0",
	}
	healthChecker := health.NewHealthChecker(logger, healthConfig)

	// Test with custom paths
	customPaths := map[string]string{
		"health":    "/status",
		"liveness":  "/ping",
		"readiness": "/ready",
	}

	routes.SetupCustomHealthEndpoints(router, logger, healthChecker, customPaths)

	// Test custom endpoints
	testCases := []struct {
		name           string
		path           string
		expectedStatus int
	}{
		{
			name:           "Custom health status",
			path:           "/status",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom liveness ping",
			path:           "/ping",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Custom readiness",
			path:           "/ready",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Custom health endpoint should be registered")
			assert.Contains(t, []int{http.StatusOK, http.StatusServiceUnavailable}, w.Code)
		})
	}
}

func TestSetupCustomHealthEndpointsWithNilHealthChecker(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Test with nil health checker
	customPaths := map[string]string{
		"health":    "/status",
		"liveness":  "/ping",
		"readiness": "/ready",
	}

	// Should not panic and should log error
	assert.NotPanics(t, func() {
		routes.SetupCustomHealthEndpoints(router, logger, nil, customPaths)
	})

	// Verify no endpoints are registered
	testCases := []struct {
		name string
		path string
	}{
		{"Health status", "/status"},
		{"Liveness ping", "/ping"},
		{"Readiness", "/ready"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusNotFound, w.Code, "Endpoint should not be registered with nil health checker")
		})
	}
}

func TestSetupCustomHealthEndpointsWithNilPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Create a health checker
	healthChecker := health.NewHealthChecker(logger, nil)

	// Test with nil paths (should use defaults)
	routes.SetupCustomHealthEndpoints(router, logger, healthChecker, nil)

	// Verify default paths are registered
	testCases := []struct {
		name string
		path string
	}{
		{"Default health", "/health"},
		{"Default liveness", "/healthz"},
		{"Default readiness", "/readyz"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Default health endpoint should be registered")
		})
	}
}

func TestHealthEndpointResponseStructure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	routes.SetupHealthEndpoints(router, logger)

	// Test health endpoint response structure
	req, err := http.NewRequest("GET", "/health", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.NotEqual(t, http.StatusNotFound, w.Code)

	// If the endpoint returns 200, verify response structure
	if w.Code == http.StatusOK {
		assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		// Note: We can't easily test the exact JSON structure without unmarshaling
		// since the health status depends on external dependencies
	}
}

func TestLivenessEndpointResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	routes.SetupHealthEndpoints(router, logger)

	req, err := http.NewRequest("GET", "/healthz", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Liveness probe should always return 200 if the service is running
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
}

func TestReadinessEndpointResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	routes.SetupHealthEndpoints(router, logger)

	req, err := http.NewRequest("GET", "/readyz", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Readiness probe may return 200 or 503 depending on dependencies
	assert.Contains(t, []int{http.StatusOK, http.StatusServiceUnavailable}, w.Code)
	assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
}

func TestHealthMetricsMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Test with metrics enabled
	config := &routes.HealthEndpointConfig{
		HealthPath:    "/health",
		LivenessPath:  "/healthz",
		ReadinessPath: "/readyz",
		EnableMetrics: true,
	}

	routes.SetupHealthEndpointsWithConfig(router, logger, config)

	// Test that health endpoints work with metrics middleware
	testCases := []struct {
		name string
		path string
	}{
		{"Health with metrics", "/health"},
		{"Liveness with metrics", "/healthz"},
		{"Readiness with metrics", "/readyz"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Health endpoint with metrics should be registered")
		})
	}
}

func TestHealthEndpointsWithDifferentHTTPMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	routes.SetupHealthEndpoints(router, logger)

	// Test that health endpoints only respond to GET requests
	testCases := []struct {
		name           string
		path           string
		method         string
		expectedStatus int
	}{
		{"GET health", "/health", "GET", http.StatusOK},
		{"POST health", "/health", "POST", http.StatusNotFound},
		{"PUT health", "/health", "PUT", http.StatusNotFound},
		{"DELETE health", "/health", "DELETE", http.StatusNotFound},
		{"GET liveness", "/healthz", "GET", http.StatusOK},
		{"POST liveness", "/healthz", "POST", http.StatusNotFound},
		{"GET readiness", "/readyz", "GET", http.StatusOK},
		{"POST readiness", "/readyz", "POST", http.StatusNotFound},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(tc.method, tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if tc.method == "GET" {
				assert.NotEqual(t, http.StatusNotFound, w.Code, "GET request should be handled")
			} else {
				assert.Equal(t, http.StatusNotFound, w.Code, "Non-GET request should return 404")
			}
		})
	}
}

func TestGetDefaultHealthEndpointConfig(t *testing.T) {
	// Test that the default configuration is properly set by testing the behavior
	// Since getDefaultHealthEndpointConfig is private, we test it indirectly
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	// Setup with nil config (should use defaults)
	routes.SetupHealthEndpointsWithConfig(router, logger, nil)

	// Verify default endpoints are registered
	testCases := []struct {
		name string
		path string
	}{
		{"Default health", "/health"},
		{"Default liveness", "/healthz"},
		{"Default readiness", "/readyz"},
		{"Default detailed health", "/health/detailed"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Default health endpoint should be registered")
		})
	}
}

func TestHealthEndpointsLogging(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Create a logger that captures logs
	logger := zap.NewNop() // In a real test, you might want to use a test logger that captures output

	config := &routes.HealthEndpointConfig{
		HealthPath:    "/health",
		LivenessPath:  "/healthz",
		ReadinessPath: "/readyz",
		EnableMetrics: true,
	}

	// Should not panic during setup
	assert.NotPanics(t, func() {
		routes.SetupHealthEndpointsWithConfig(router, logger, config)
	})

	// Test that endpoints are accessible
	testCases := []struct {
		name string
		path string
	}{
		{"Health", "/health"},
		{"Liveness", "/healthz"},
		{"Readiness", "/readyz"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", tc.path, nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Health endpoint should be accessible")
		})
	}
}

func TestHealthEndpointsConcurrentAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	logger := zap.NewNop()

	routes.SetupHealthEndpoints(router, logger)

	// Test concurrent access to health endpoints
	testCases := []struct {
		name string
		path string
	}{
		{"Health", "/health"},
		{"Liveness", "/healthz"},
		{"Readiness", "/readyz"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Make multiple concurrent requests
			const numRequests = 10
			results := make(chan int, numRequests)

			for i := 0; i < numRequests; i++ {
				go func() {
					req, err := http.NewRequest("GET", tc.path, nil)
					require.NoError(t, err)

					w := httptest.NewRecorder()
					router.ServeHTTP(w, req)
					results <- w.Code
				}()
			}

			// Collect results
			for i := 0; i < numRequests; i++ {
				statusCode := <-results
				assert.NotEqual(t, http.StatusNotFound, statusCode, "Concurrent request should be handled")
			}
		})
	}
}
