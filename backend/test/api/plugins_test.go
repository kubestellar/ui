package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin name",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/"+strconv.Itoa(tt.pluginID), nil)
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
				"id":      123456789,
				"name":    "test-plugin",
				"version": "v1.0.0",
				"source":  "https://github.com/test/plugin",
			},
			expectedStatus: http.StatusAccepted, // 202 - Installation is async
		},
		{
			name: "Missing plugin ID",
			requestBody: map[string]interface{}{
				"version": "v1.0.0",
				"source":  "https://github.com/test/plugin",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request",
		},
		{
			name: "Missing plugin source",
			requestBody: map[string]interface{}{
				"id":      123456789,
				"name":    "test-plugin",
				"version": "v1.0.0",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request",
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
			req, _ := http.NewRequest(http.MethodPost, "/plugins", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin uninstallation",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodDelete, "/plugins/"+strconv.Itoa(tt.pluginID), nil)
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin enable",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+strconv.Itoa(tt.pluginID)+"/enable", nil)
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin disable",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+strconv.Itoa(tt.pluginID)+"/disable", nil)
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin status check",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/plugins/"+strconv.Itoa(tt.pluginID)+"/status", nil)
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
		pluginID       int
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid plugin reload",
			pluginID:       123456789,
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set plugin ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: strconv.Itoa(tt.pluginID)},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/plugins/"+strconv.Itoa(tt.pluginID)+"/reload", nil)
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
				"pluginsDirectory":   "/custom/plugins",
				"autoloadPlugins":    true,
				"pluginTimeout":      60,
				"maxConcurrentCalls": 20,
				"logLevel":           "debug",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid configuration",
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
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
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
				"pluginId": 123456789,
				"rating":   4.5,
				"comments": "Great plugin!",
			},
			expectedStatus: http.StatusNotFound, // Plugin not found in test environment
			expectedError:  "Plugin not found",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid feedback data",
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
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
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
