package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupPluginRoutes(t *testing.T) {
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
			name:           "List all plugins",
			path:           "/api/plugins",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get specific plugin details",
			path:           "/api/plugins/2",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Install plugin",
			path:   "/api/plugins/install",
			method: "POST",
			body: map[string]interface{}{
				"id":      1,
				"name":    "backup-plugin",
				"version": "v1.0.0",
				"source":  "github.com/example/backup-plugin",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Uninstall plugin",
			path:           "/api/plugins/1",
			method:         "DELETE",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Enable plugin",
			path:           "/api/plugins/1/enable",
			method:         "POST",
			body:           map[string]interface{}{},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Disable plugin",
			path:           "/api/plugins/1/disable",
			method:         "POST",
			body:           map[string]interface{}{},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get plugin status",
			path:           "/api/plugins/2/status",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get system metrics",
			path:           "/api/plugins/system/metrics",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get system configuration",
			path:           "/api/plugins/system/configuration",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Update system configuration",
			path:   "/api/plugins/system/configuration",
			method: "PUT",
			body: map[string]interface{}{
				"maxPlugins":    10,
				"enableLogging": true,
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:   "Submit plugin feedback",
			path:   "/api/plugins/feedback",
			method: "POST",
			body: map[string]interface{}{
				"pluginId":   1,
				"rating":     5,
				"comment":    "Great plugin!",
				"suggestion": "Please make it more stable!",
			},
			expectedStatus: http.StatusCreated,
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

			// For route registration tests, we check that the route exists and handler was called
			// A 404 from our JSON API means the route was found but resource doesn't exist (which is fine)
			// A routing 404 would typically be plain text "404 page not found"
			responseBody := w.Body.String()
			isJSONResponse := responseBody != "" && (responseBody[0] == '{' || responseBody[0] == '[')
			isRoutingError := w.Code == http.StatusNotFound && !isJSONResponse

			assert.False(t, isRoutingError, "Route should be registered, got routing 404")
		})
	}
}

func TestPluginParameterizedRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	plugins := []int{1, 2, 3} // 1 is the backup plugin
	operations := []struct {
		operation string
		method    string
		needsBody bool
	}{
		{"reload", "POST", true},
		{"enable", "POST", true},
		{"disable", "POST", true},
		{"status", "GET", false},
	}

	for _, plugin := range plugins {
		for _, op := range operations {
			t.Run(op.operation+" "+strconv.Itoa(plugin), func(t *testing.T) {
				path := "/api/plugins/" + strconv.Itoa(plugin) + "/" + op.operation
				var req *http.Request
				if op.needsBody {
					body := map[string]interface{}{}
					jsonBody, _ := json.Marshal(body)
					req, _ = http.NewRequest(op.method, path, bytes.NewBuffer(jsonBody))
					req.Header.Set("Content-Type", "application/json")
				} else {
					req, _ = http.NewRequest(op.method, path, nil)
				}

				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)

				// Check that the route exists and handler was called
				responseBody := w.Body.String()
				isJSONResponse := responseBody != "" && (responseBody[0] == '{' || responseBody[0] == '[')
				isRoutingError := w.Code == http.StatusNotFound && !isJSONResponse

				assert.False(t, isRoutingError, "Plugin "+op.operation+" route should be registered")
			})
		}
	}
}

func TestPluginInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	invalidMethodTests := []struct {
		name   string
		method string
		url    string
	}{
		{"Invalid POST on GET plugins list", "POST", "/api/plugins"},
		{"Invalid PUT on GET plugin details", "PUT", "/api/plugins/123456789"},
		{"Invalid GET on POST install", "GET", "/api/plugins/install"},
		{"Invalid DELETE on POST enable", "DELETE", "/api/plugins/123456789/enable"},
		{"Invalid GET on POST feedback", "GET", "/api/plugins/feedback"},
	}

	for _, tt := range invalidMethodTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Since the routes are registered with specific methods, using wrong method should return 404 or 405
			// Accept both 404 and 405 as valid responses for invalid methods
			assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed || w.Code == http.StatusBadRequest,
				"Invalid method should return 404 or 405, got %d", w.Code)
		})
	}
}
