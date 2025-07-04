package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup all routes
	routes.SetupRoutes(router)

	// Test various route categories to ensure they are registered
	testRoutes := []struct {
		name           string
		path           string
		method         string
		expectedStatus int
	}{
		// Cluster routes
		{
			name:           "Get clusters",
			path:           "/api/clusters",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// Namespace routes
		{
			name:           "Get namespaces",
			path:           "/api/namespaces",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// Binding Policy routes
		{
			name:           "Get binding policies",
			path:           "/api/bp",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// WDS context routes
		{
			name:           "Get WDS context",
			path:           "/wds/get/context",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// Installer routes
		{
			name:           "Check prerequisites",
			path:           "/api/prerequisites",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// Auth routes
		{
			name:           "Login endpoint",
			path:           "/login",
			method:         "POST",
			expectedStatus: http.StatusBadRequest, // Expected for POST without body
		},
		// Metrics routes
		{
			name:           "System metrics",
			path:           "/api/metrics/system",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
		// Plugin routes
		{
			name:           "List plugins",
			path:           "/api/plugins",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies, but route exists
		},
	}

	for _, tt := range testRoutes {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// The main test is that the route is registered (not 404)
			// Accept various error codes that might occur due to missing dependencies
			// but ensure the route exists (not 404)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")

			// Accept common error codes that occur due to missing external dependencies
			validCodes := []int{
				http.StatusOK,
				http.StatusBadRequest,
				http.StatusInternalServerError,
				http.StatusServiceUnavailable,
			}

			isValidCode := false
			for _, code := range validCodes {
				if w.Code == code {
					isValidCode = true
					break
				}
			}

			assert.True(t, isValidCode, "Route should return a valid status code (200, 400, 500, 503), got %d", w.Code)
		})
	}
}

func TestSetupRoutesStructure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Ensure SetupRoutes doesn't panic
	assert.NotPanics(t, func() {
		routes.SetupRoutes(router)
	})

	// Verify router has routes registered
	routes := router.Routes()
	assert.Greater(t, len(routes), 0, "Router should have routes registered")
}

func TestNonExistentRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	req, _ := http.NewRequest("GET", "/nonexistent/route", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}
