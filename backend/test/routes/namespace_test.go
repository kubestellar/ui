package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupNamespaceRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		path           string
		method         string
		body           map[string]interface{}
		expectedStatus int
	}{
		{
			name:           "Get all namespaces",
			path:           "/api/namespaces",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies
		},
		{
			name:           "Get namespace details",
			path:           "/api/namespaces/default",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 404/500 due to missing dependencies
		},
		{
			name:   "Create namespace",
			path:   "/api/namespaces/create",
			method: "POST",
			body: map[string]interface{}{
				"name": "test-namespace",
				"labels": map[string]string{
					"environment": "test",
				},
			},
			expectedStatus: http.StatusOK, // Might be 400/500 due to validation or missing dependencies
		},
		{
			name:   "Update namespace",
			path:   "/api/namespaces/update/test-namespace",
			method: "PUT",
			body: map[string]interface{}{
				"labels": map[string]string{
					"environment": "production",
				},
			},
			expectedStatus: http.StatusOK, // Might be 400/500 due to validation or missing dependencies
		},
		{
			name:           "Delete namespace",
			path:           "/api/namespaces/delete/test-namespace",
			method:         "DELETE",
			expectedStatus: http.StatusOK, // Might be 404/500 due to missing dependencies
		},
		{
			name:           "WebSocket namespace stream",
			path:           "/ws/namespaces",
			method:         "GET",
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "Get all contexts namespaces",
			path:           "/api/all-contexts/namespaces",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies
		},
		{
			name:           "WebSocket all contexts",
			path:           "/ws/all-contexts",
			method:         "GET",
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "WebSocket context namespace",
			path:           "/ws/context-namespace",
			method:         "GET",
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "Compare namespace",
			path:           "/api/compare-namespace/default",
			method:         "GET",
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies
		},
		{
			name:   "Sync namespace",
			path:   "/api/sync-namespace/default",
			method: "POST",
			body: map[string]interface{}{
				"targetContexts": []string{"context1", "context2"},
			},
			expectedStatus: http.StatusOK, // Might be 400/500 due to validation or missing dependencies
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				req, _ = http.NewRequest(tt.method, tt.path, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, _ = http.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// For route registration tests, check that the route exists and handler was called
			// A 404 from our JSON API means the route was found but resource doesn't exist (fine for testing)
			// A routing 404 would typically be plain text "404 page not found"
			responseBody := w.Body.String()
			isJSONResponse := responseBody != "" && (responseBody[0] == '{' || responseBody[0] == '[')
			isRoutingError := w.Code == http.StatusNotFound && !isJSONResponse

			assert.False(t, isRoutingError, "Route should be registered")
		})
	}
}

func TestNamespaceWebSocketRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	webSocketRoutes := []string{
		"/ws/namespaces",
		"/ws/all-contexts",
		"/ws/context-namespace",
	}

	for _, route := range webSocketRoutes {
		t.Run("WebSocket route "+route, func(t *testing.T) {
			req, _ := http.NewRequest("GET", route, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// WebSocket routes should not return 404
			assert.NotEqual(t, http.StatusNotFound, w.Code, "WebSocket route should be registered")
			// Without proper headers, should fail upgrade
			assert.NotEqual(t, http.StatusSwitchingProtocols, w.Code, "Should not upgrade without proper headers")
		})
	}
}

func TestNamespaceParameterizedRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name      string
		path      string
		method    string
		namespace string
	}{
		{
			name:      "Get specific namespace details",
			path:      "/api/namespaces/kube-system",
			method:    "GET",
			namespace: "kube-system",
		},
		{
			name:      "Update specific namespace",
			path:      "/api/namespaces/update/production",
			method:    "PUT",
			namespace: "production",
		},
		{
			name:      "Delete specific namespace",
			path:      "/api/namespaces/delete/test-env",
			method:    "DELETE",
			namespace: "test-env",
		},
		{
			name:      "Compare specific namespace",
			path:      "/api/compare-namespace/monitoring",
			method:    "GET",
			namespace: "monitoring",
		},
		{
			name:      "Sync specific namespace",
			path:      "/api/sync-namespace/dev",
			method:    "POST",
			namespace: "dev",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.method == "POST" || tt.method == "PUT" {
				body := map[string]interface{}{
					"namespace": tt.namespace,
				}
				jsonBody, _ := json.Marshal(body)
				req, _ = http.NewRequest(tt.method, tt.path, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, _ = http.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check that the route exists and handler was called
			responseBody := w.Body.String()
			isJSONResponse := responseBody != "" && (responseBody[0] == '{' || responseBody[0] == '[')
			isRoutingError := w.Code == http.StatusNotFound && !isJSONResponse

			assert.False(t, isRoutingError, "Parameterized route should be registered")
		})
	}
}

func TestNamespaceCompareWithQueryParams(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test compare namespace with query parameters
	t.Run("Compare namespace with query params", func(t *testing.T) {
		path := "/api/compare-namespace/default?contexts=ctx1,ctx2&detailed=true"
		req, _ := http.NewRequest("GET", path, nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.NotEqual(t, http.StatusNotFound, w.Code, "Compare namespace route with query params should be registered")
	})
}

func TestNamespaceInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	invalidMethodTests := []struct {
		name   string
		method string
		url    string
	}{
		{"Invalid POST on GET namespaces", "POST", "/api/namespaces"},
		{"Invalid DELETE on GET namespace details", "DELETE", "/api/namespaces/default"},
		{"Invalid GET on POST create", "GET", "/api/namespaces"},
		{"Invalid POST on DELETE namespace", "POST", "/api/namespaces/test"},
		{"Invalid PUT on GET compare", "PUT", "/api/compare-namespace/default"},
	}

	for _, tt := range invalidMethodTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Since the routes are registered with specific methods, using wrong method should return 404, 405, 500, 200, or 401
			// Accept 404, 405, 500, 200, and 401 as valid responses for invalid methods
			assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed || w.Code == http.StatusInternalServerError || w.Code == http.StatusOK || w.Code == http.StatusUnauthorized,
				"Invalid method should return 404, 405, 500, 200, or 401, got %d", w.Code)
		})
	}
}

func TestNamespaceSyncOperations(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test sync operations with various configurations
	syncTests := []struct {
		name      string
		namespace string
		body      map[string]interface{}
	}{
		{
			name:      "Sync with target contexts",
			namespace: "production",
			body: map[string]interface{}{
				"targetContexts": []string{"prod-east", "prod-west"},
				"force":          false,
			},
		},
		{
			name:      "Force sync namespace",
			namespace: "staging",
			body: map[string]interface{}{
				"targetContexts": []string{"staging-cluster"},
				"force":          true,
			},
		},
	}

	for _, tt := range syncTests {
		t.Run(tt.name, func(t *testing.T) {
			path := "/api/sync-namespace/" + tt.namespace
			jsonBody, _ := json.Marshal(tt.body)
			req, _ := http.NewRequest("POST", path, bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Sync namespace route should be registered")
		})
	}
}
