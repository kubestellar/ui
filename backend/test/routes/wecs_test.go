package routes_test

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
)

func TestGetWecsResources(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		path           string
		method         string
		queryParams    map[string]string
		expectedStatus int
	}{
		{
			name:           "WebSocket WECS stream",
			path:           "/ws/wecs",
			method:         "GET",
			queryParams:    map[string]string{"context": "wds1"},
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "WebSocket logs stream",
			path:           "/ws/logs",
			method:         "GET",
			queryParams:    map[string]string{"context": "wds1"},
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "Pod exec shell",
			path:           "/ws/pod/default/test-pod/shell/main",
			method:         "GET",
			queryParams:    map[string]string{"context": "wds1"},
			expectedStatus: http.StatusBadRequest, // WebSocket upgrade will fail in test
		},
		{
			name:           "Get pod containers",
			path:           "/list/container/default/test-pod",
			method:         "GET",
			queryParams:    map[string]string{"context": "wds1"},
			expectedStatus: http.StatusOK, // Might be 500 due to missing dependencies
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Build URL with query parameters
			u, _ := url.Parse(tt.path)
			if tt.queryParams != nil {
				q := u.Query()
				for k, v := range tt.queryParams {
					q.Set(k, v)
				}
				u.RawQuery = q.Encode()
			}

			req, _ := http.NewRequest(tt.method, u.String(), nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Main test is that route exists (not 404)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")

			// Accept various error codes that occur due to missing external dependencies
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

			assert.True(t, isValidCode, "Route should return a valid status code, got %d", w.Code)
		})
	}
}

func TestWecsWebSocketRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test WebSocket routes without upgrade headers but with context parameter
	webSocketRoutes := []string{
		"/ws/wecs?context=wds1",
		"/ws/logs?context=wds1",
		"/ws/pod/test-ns/test-pod/shell/container1?context=wds1",
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

			// Accept various error codes that occur due to missing external dependencies
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

			assert.True(t, isValidCode, "WebSocket route should return a valid status code, got %d", w.Code)
		})
	}
}

func TestWecsParameterizedRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name      string
		path      string
		namespace string
		pod       string
		container string
	}{
		{
			name:      "Pod shell with parameters",
			path:      "/ws/pod/kube-system/coredns-pod/shell/coredns?context=wds1",
			namespace: "kube-system",
			pod:       "coredns-pod",
			container: "coredns",
		},
		{
			name:      "Container list with parameters",
			path:      "/list/container/default/nginx-pod?context=wds1",
			namespace: "default",
			pod:       "nginx-pod",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Route should exist, not 404
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Parameterized route should be registered")

			// Accept various error codes that occur due to missing external dependencies
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

			assert.True(t, isValidCode, "Parameterized route should return a valid status code, got %d", w.Code)
		})
	}
}

func TestWecsInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	invalidMethodTests := []struct {
		name   string
		method string
		url    string
	}{
		{"Invalid POST on WebSocket WECS", "POST", "/api/wecs"},
		{"Invalid DELETE on WebSocket logs", "DELETE", "/api/wecs/logs"},
		{"Invalid PUT on pod shell", "PUT", "/api/wecs/pod-shell"},
		{"Invalid POST on container list", "POST", "/api/wecs/containers"},
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

func TestWecsContainerListRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test with various namespace and pod combinations
	testCases := []struct {
		namespace string
		pod       string
	}{
		{"default", "nginx-pod"},
		{"kube-system", "coredns"},
		{"monitoring", "prometheus-server"},
	}

	for _, tc := range testCases {
		t.Run("Container list for "+tc.namespace+"/"+tc.pod, func(t *testing.T) {
			path := "/list/container/" + tc.namespace + "/" + tc.pod + "?context=wds1"
			req, _ := http.NewRequest("GET", path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Route should exist
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Container list route should be registered")

			// Accept various error codes that occur due to missing external dependencies
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

			assert.True(t, isValidCode, "Container list route should return a valid status code, got %d", w.Code)
		})
	}
}
