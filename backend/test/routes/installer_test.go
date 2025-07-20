package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/stretchr/testify/assert"
)

// TestInstallerRoutesStandalone tests the installer routes without the full routes setup
func TestInstallerRoutesStandalone(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup only installer routes manually
	router.GET("/api/prerequisites", api.CheckPrerequisitesHandler)
	router.POST("/api/install", api.InstallHandler)
	router.GET("/api/logs/:id", api.GetLogsHandler)
	router.GET("/api/ws/logs/:id", api.LogsWebSocketHandler)
	router.GET("/api/kubestellar/status", api.CheckKubeStellarStatusHandler)

	// Test all installer routes
	testCases := []struct {
		name           string
		path           string
		method         string
		body           interface{}
		expectedStatus int
		description    string
	}{
		{
			name:           "Check Prerequisites",
			path:           "/api/prerequisites",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusOK,
			description:    "Should return prerequisites check status",
		},
		{
			name:           "Install with valid platform (kind)",
			path:           "/api/install",
			method:         "POST",
			body:           map[string]string{"platform": "kind"},
			expectedStatus: http.StatusOK,
			description:    "Should accept valid platform and return install ID",
		},
		{
			name:           "Install with valid platform (k3d)",
			path:           "/api/install",
			method:         "POST",
			body:           map[string]string{"platform": "k3d"},
			expectedStatus: http.StatusOK,
			description:    "Should accept valid platform and return install ID",
		},
		{
			name:           "Install with invalid platform",
			path:           "/api/install",
			method:         "POST",
			body:           map[string]string{"platform": "invalid"},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject invalid platform",
		},
		{
			name:           "Install with missing platform",
			path:           "/api/install",
			method:         "POST",
			body:           map[string]string{},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject request with missing platform",
		},
		{
			name:           "Install with invalid JSON",
			path:           "/api/install",
			method:         "POST",
			body:           "invalid json",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject invalid JSON body",
		},
		{
			name:           "Get logs with valid ID",
			path:           "/api/logs/test-install-id",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusNotFound, // Will be 404 since install ID doesn't exist
			description:    "Should handle logs request (404 expected for non-existent ID)",
		},
		{
			name:           "Get logs with empty ID",
			path:           "/api/logs/",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusNotFound,
			description:    "Should handle empty install ID",
		},
		{
			name:           "WebSocket logs with valid ID",
			path:           "/api/ws/logs/test-install-id",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusNotFound, // Will be 404 since install ID doesn't exist
			description:    "Should handle WebSocket logs request (404 expected for non-existent ID)",
		},
		{
			name:           "WebSocket logs with empty ID",
			path:           "/api/ws/logs/",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusNotFound,
			description:    "Should handle empty WebSocket install ID",
		},
		{
			name:           "Check KubeStellar Status",
			path:           "/api/kubestellar/status",
			method:         "GET",
			body:           nil,
			expectedStatus: http.StatusOK,
			description:    "Should return KubeStellar status",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			var req *http.Request
			var err error

			if tc.body != nil {
				var bodyBytes []byte
				if str, ok := tc.body.(string); ok {
					bodyBytes = []byte(str)
				} else {
					bodyBytes, err = json.Marshal(tc.body)
					assert.NoError(t, err)
				}
				req, err = http.NewRequest(tc.method, tc.path, bytes.NewBuffer(bodyBytes))
				if tc.method == "POST" {
					req.Header.Set("Content-Type", "application/json")
				}
			} else {
				req, err = http.NewRequest(tc.method, tc.path, nil)
			}
			assert.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Check that the route is registered and returns expected status
			assert.Equal(t, tc.expectedStatus, w.Code,
				"Expected status %d for %s %s, got %d. Description: %s",
				tc.expectedStatus, tc.method, tc.path, w.Code, tc.description)
		})
	}
}

func TestInstallerRoutesMethodHandlingStandalone(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup only installer routes manually
	router.GET("/api/prerequisites", api.CheckPrerequisitesHandler)
	router.POST("/api/install", api.InstallHandler)
	router.GET("/api/logs/:id", api.GetLogsHandler)
	router.GET("/api/ws/logs/:id", api.LogsWebSocketHandler)
	router.GET("/api/kubestellar/status", api.CheckKubeStellarStatusHandler)

	// Test that installer routes handle different HTTP methods correctly
	testCases := []struct {
		path           string
		method         string
		expectedStatus int
		description    string
	}{
		{
			path:           "/api/prerequisites",
			method:         "POST",
			expectedStatus: http.StatusNotFound,
			description:    "POST to GET-only endpoint should return 404",
		},
		{
			path:           "/api/prerequisites",
			method:         "PUT",
			expectedStatus: http.StatusNotFound,
			description:    "PUT to GET-only endpoint should return 404",
		},
		{
			path:           "/api/install",
			method:         "GET",
			expectedStatus: http.StatusNotFound,
			description:    "GET to POST-only endpoint should return 404",
		},
		{
			path:           "/api/install",
			method:         "PUT",
			expectedStatus: http.StatusNotFound,
			description:    "PUT to POST-only endpoint should return 404",
		},
		{
			path:           "/api/logs/test-id",
			method:         "POST",
			expectedStatus: http.StatusNotFound,
			description:    "POST to GET-only endpoint should return 404",
		},
		{
			path:           "/api/ws/logs/test-id",
			method:         "POST",
			expectedStatus: http.StatusNotFound,
			description:    "POST to GET-only endpoint should return 404",
		},
		{
			path:           "/api/kubestellar/status",
			method:         "POST",
			expectedStatus: http.StatusNotFound,
			description:    "POST to GET-only endpoint should return 404",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			req, err := http.NewRequest(tc.method, tc.path, nil)
			assert.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code,
				"Expected status %d for %s %s, got %d",
				tc.expectedStatus, tc.method, tc.path, w.Code)
		})
	}
}

func TestInstallerRoutesContentTypeHandlingStandalone(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup only installer routes manually
	router.GET("/api/prerequisites", api.CheckPrerequisitesHandler)
	router.POST("/api/install", api.InstallHandler)
	router.GET("/api/logs/:id", api.GetLogsHandler)
	router.GET("/api/ws/logs/:id", api.LogsWebSocketHandler)
	router.GET("/api/kubestellar/status", api.CheckKubeStellarStatusHandler)

	// Test that POST requests to /api/install handle different content types
	testCases := []struct {
		contentType    string
		body           string
		expectedStatus int
		description    string
	}{
		{
			contentType:    "application/json",
			body:           `{"platform": "kind"}`,
			expectedStatus: http.StatusOK,
			description:    "Valid JSON with correct content type should succeed",
		},
		{
			contentType:    "text/plain",
			body:           `{"platform": "kind"}`,
			expectedStatus: http.StatusBadRequest,
			description:    "JSON with wrong content type should fail",
		},
		{
			contentType:    "application/json",
			body:           `invalid json`,
			expectedStatus: http.StatusBadRequest,
			description:    "Invalid JSON should fail",
		},
		{
			contentType:    "",
			body:           `{"platform": "kind"}`,
			expectedStatus: http.StatusBadRequest,
			description:    "Missing content type should fail",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.description, func(t *testing.T) {
			req, err := http.NewRequest("POST", "/api/install", bytes.NewBufferString(tc.body))
			assert.NoError(t, err)

			if tc.contentType != "" {
				req.Header.Set("Content-Type", tc.contentType)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code,
				"Expected status %d for content type %s, got %d",
				tc.expectedStatus, tc.contentType, w.Code)
		})
	}
}
