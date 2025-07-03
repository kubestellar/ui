package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/routes"
	"github.com/stretchr/testify/assert"
)

// TestSetupDeploymentRoutes tests that all deployment routes are properly registered
// and handle requests appropriately. Note that some routes may fail due to missing
// Kubernetes contexts or Redis connectivity, but the routes should still be accessible.
func TestSetupDeploymentRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		method         string
		url            string
		body           interface{}
		expectedStatus int
		description    string
	}{
		{
			name:           "Get WDS workloads",
			method:         "GET",
			url:            "/api/wds/workloads",
			expectedStatus: 200,
			description:    "Should handle WDS workloads request",
		},
		{
			name:           "Get deployment by name",
			method:         "GET",
			url:            "/api/wds/nginx-deployment",
			expectedStatus: 200,
			description:    "Should handle deployment by name request",
		},
		{
			name:           "Get deployment status",
			method:         "GET",
			url:            "/api/wds/status",
			expectedStatus: 200,
			description:    "Should handle deployment status request",
		},
		{
			name:           "WebSocket deployment handler",
			method:         "GET",
			url:            "/ws",
			expectedStatus: 400, // WebSocket upgrade will fail in test environment
			description:    "Should handle WebSocket deployment route",
		},
		{
			name:           "WebSocket deployment logs",
			method:         "GET",
			url:            "/api/wds/logs",
			expectedStatus: 400, // WebSocket upgrade will fail in test environment
			description:    "Should handle WebSocket deployment logs route",
		},
		{
			name:           "Get current context",
			method:         "GET",
			url:            "/api/context",
			expectedStatus: 200,
			description:    "Should handle context request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.url, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.url, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// For route registration tests, we just want to ensure the route exists (not 404)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")

			// For WebSocket routes, we expect 400 (Bad Request) due to missing WebSocket headers
			if tt.url == "/ws" || tt.url == "/api/wds/logs" {
				assert.Equal(t, http.StatusBadRequest, w.Code, "WebSocket routes should return 400 without proper headers")
			}
		})
	}
}

func TestDeploymentParameterizedRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	parameterizedTests := []struct {
		name        string
		method      string
		url         string
		description string
	}{
		{
			name:        "Get deployment nginx-deployment",
			method:      "GET",
			url:         "/api/wds/nginx-deployment",
			description: "Should handle specific deployment request",
		},
		{
			name:        "Get deployment app-deployment",
			method:      "GET",
			url:         "/api/wds/app-deployment",
			description: "Should handle specific deployment request",
		},
		{
			name:        "Get deployment web-server",
			method:      "GET",
			url:         "/api/wds/web-server",
			description: "Should handle specific deployment request",
		},
		{
			name:        "Get deployment microservice-a",
			method:      "GET",
			url:         "/api/wds/microservice-a",
			description: "Should handle specific deployment request",
		},
		{
			name:        "Get deployment database-service",
			method:      "GET",
			url:         "/api/wds/database-service",
			description: "Should handle specific deployment request",
		},
	}

	for _, tt := range parameterizedTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// We just want to ensure the parameterized routes are registered (not 404)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Parameterized route should be registered")
		})
	}
}

func TestDeploymentWebSocketRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	webSocketTests := []struct {
		name string
		url  string
	}{
		{"WebSocket route /ws", "/ws"},
		{"WebSocket route /api/wds/logs", "/api/wds/logs"},
	}

	for _, tt := range webSocketTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// WebSocket routes should exist (not return 404) but will fail upgrade (400)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "WebSocket route should be registered")
			// WebSocket upgrade will fail in test environment without proper headers
			assert.Equal(t, http.StatusBadRequest, w.Code, "WebSocket routes should return 400 without proper headers")
		})
	}
}

func TestDeploymentInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	invalidMethodTests := []struct {
		name   string
		method string
		url    string
	}{
		{"Invalid POST on GET workloads", "POST", "/api/wds/workloads"},
		{"Invalid DELETE on GET deployment", "DELETE", "/api/wds/nginx"},
		{"Invalid PUT on GET status", "PUT", "/api/wds/status"},
		{"Invalid POST on GET context", "POST", "/api/context"},
	}

	for _, tt := range invalidMethodTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Since the routes are registered with specific methods, using wrong method should return 404 or 405
			// Accept both 404 and 405 as valid responses for invalid methods
			assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed,
				"Invalid method should return 404 or 405, got %d", w.Code)
		})
	}
}
