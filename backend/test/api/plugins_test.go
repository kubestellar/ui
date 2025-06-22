package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/stretchr/testify/assert"
)

func TestListPluginsHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "List plugins",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins", nil)
			c.Request = req

			// Call the handler
			api.ListPluginsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestGetPluginDetailsHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin name",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusNotFound, // Expected in test environment
			expectedError:  "Plugin not found",
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/"+tt.pluginName, nil)
			c.Request = req

			// Call the handler
			api.GetPluginDetailsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestInstallPluginHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid plugin installation",
			requestBody: map[string]interface{}{
				"name":        "test-plugin",
				"source":      "https://github.com/test/plugin",
				"version":     "v1.0.0",
				"description": "Test plugin",
			},
			expectedStatus: http.StatusOK, // May succeed or fail depending on plugin availability
		},
		{
			name: "Missing plugin name",
			requestBody: map[string]interface{}{
				"source":      "https://github.com/test/plugin",
				"version":     "v1.0.0",
				"description": "Test plugin",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
		{
			name: "Missing plugin source",
			requestBody: map[string]interface{}{
				"name":        "test-plugin",
				"version":     "v1.0.0",
				"description": "Test plugin",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin source is required",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request body",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request body
			var jsonBody []byte
			if tt.requestBody != nil {
				jsonBody, _ = json.Marshal(tt.requestBody)
			}
			req, _ := http.NewRequest(http.MethodPost, "/plugins/install", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.InstallPluginHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestUninstallPluginHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin uninstallation",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusOK, // May succeed even if plugin doesn't exist
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodDelete, "/plugins/"+tt.pluginName, nil)
			c.Request = req

			// Call the handler
			api.UninstallPluginHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestEnablePluginHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin enable",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusOK, // May succeed even if plugin doesn't exist
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+tt.pluginName+"/enable", nil)
			c.Request = req

			// Call the handler
			api.EnablePluginHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestDisablePluginHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin disable",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusOK, // May succeed even if plugin doesn't exist
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+tt.pluginName+"/disable", nil)
			c.Request = req

			// Call the handler
			api.DisablePluginHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestGetPluginStatusHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin status check",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusOK, // May succeed even if plugin doesn't exist
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/"+tt.pluginName+"/status", nil)
			c.Request = req

			// Call the handler
			api.GetPluginStatusHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestReloadPluginHandler(t *testing.T) {
	tests := []struct {
		name           string
		pluginName     string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin reload",
			pluginName:     "test-plugin",
			expectedStatus: http.StatusOK, // May succeed even if plugin doesn't exist
		},
		{
			name:           "Empty plugin name",
			pluginName:     "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Plugin name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin name in URL params
			c.Params = []gin.Param{
				{Key: "name", Value: tt.pluginName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+tt.pluginName+"/reload", nil)
			c.Request = req

			// Call the handler
			api.ReloadPluginHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestGetPluginSystemMetricsHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Get plugin system metrics",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/system/metrics", nil)
			c.Request = req

			// Call the handler
			api.GetPluginSystemMetricsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestGetPluginSystemConfigHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Get plugin system config",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/system/config", nil)
			c.Request = req

			// Call the handler
			api.GetPluginSystemConfigHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestUpdatePluginSystemConfigHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid config update",
			requestBody: map[string]interface{}{
				"setting1": "value1",
				"setting2": "value2",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request body",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request body
			var jsonBody []byte
			if tt.requestBody != nil {
				jsonBody, _ = json.Marshal(tt.requestBody)
			}
			req, _ := http.NewRequest(http.MethodPut, "/plugins/system/config", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.UpdatePluginSystemConfigHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestSubmitPluginFeedbackHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid feedback submission",
			requestBody: map[string]interface{}{
				"pluginName": "test-plugin",
				"rating":     5,
				"comment":    "Great plugin!",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request body",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request body
			var jsonBody []byte
			if tt.requestBody != nil {
				jsonBody, _ = json.Marshal(tt.requestBody)
			}
			req, _ := http.NewRequest(http.MethodPost, "/plugins/feedback", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.SubmitPluginFeedbackHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}
