package plugins_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/kubestellar/ui/backend/pkg/plugins"
	database "github.com/kubestellar/ui/backend/postgresql/Database"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tetratelabs/wazero"
)

func TestMain(m *testing.M) {
	// Setup: initialize the global plugin manager and registry for all tests
	manager := plugins.NewPluginManager(nil)
	registry := plugins.NewPluginRegistry("./test_plugins", manager)
	api.SetGlobalPluginManager(manager, registry)

	// Run tests
	code := m.Run()

	// Optional teardown logic can go here
	os.RemoveAll("./test_plugins") // Clean up test plugins directory

	// Exit with the code from the tests
	os.Exit(code)
}

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
			expectedStatus: http.StatusBadRequest, // 400 - Expects multipart form data
		},
		{
			name: "Missing plugin ID",
			requestBody: map[string]interface{}{
				"version": "v1.0.0",
				"source":  "https://github.com/test/plugin",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "No file uploaded or invalid file",
		},
		{
			name: "Missing plugin source",
			requestBody: map[string]interface{}{
				"id":      123456789,
				"name":    "test-plugin",
				"version": "v1.0.0",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "No file uploaded or invalid file",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "No file uploaded or invalid file",
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
	type testCase struct {
		name         string
		pluginID     int
		setupMocks   func(sqlmock.Sqlmock)
		setupPlugin  func(manager *plugins.PluginManager, registry *plugins.PluginRegistry) *plugins.Plugin
		expectedCode int
		expectedBody string
	}

	tests := []testCase{
		{
			name:     "Plugin exists and is uninstalled successfully",
			pluginID: 1,
			setupMocks: func(mock sqlmock.Sqlmock) {
				// 1. Mock CheckPluginWithInfo (plugin does not exist) for registration
				mock.ExpectQuery(`SELECT EXISTS\s+\(.*FROM plugin.*\)`).
					WithArgs("TestPlugin", "v0.1.0", "Temporary test plugin").
					WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(true))

					// 2. GetPluginIdDB
				mock.ExpectQuery(`SELECT id FROM plugin WHERE name=\$1 AND version=\$2 AND description=\$3`).
					WithArgs("TestPlugin", "v0.1.0", "Temporary test plugin").
					WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

				// 3. UpdatePluginStatusDB
				mock.ExpectExec(`UPDATE plugin SET status = \$1 WHERE id = \$2`).
					WithArgs("active", 1).
					WillReturnResult(sqlmock.NewResult(0, 1)) // 0 insert ID, 1 row affected

				// 4. Mock DELETE plugin
				mock.ExpectExec(`(?s)DELETE FROM plugin\s+WHERE id = \$1`).
					WithArgs(1).
					WillReturnResult(sqlmock.NewResult(0, 1))
			},
			setupPlugin: func(manager *plugins.PluginManager, registry *plugins.PluginRegistry) *plugins.Plugin {
				plugin := &plugins.Plugin{
					Manifest: &plugins.PluginManifest{
						Metadata: plugins.PluginMetadata{
							Name:        "TestPlugin",
							Version:     "v0.1.0",
							Description: "Temporary test plugin",
							Author:      "testuser",
						},
					},
					Status: "active",
				}

				manager.RegisterPlugin(plugin)

				pluginFolder := fmt.Sprintf("%s-%d", plugin.Manifest.Metadata.Name, plugin.ID)
				pluginDir := filepath.Join(registry.GetPluginsDirectory(), pluginFolder)
				_ = os.MkdirAll(pluginDir, 0755)
				wasmFilePath := filepath.Join(pluginDir, "plugin.wasm")
				_ = os.WriteFile(wasmFilePath, []byte("dummy wasm content"), 0644)

				return plugin
			},
			expectedCode: http.StatusOK,
			expectedBody: `{"message": "Plugin uninstalled successfully"}`,
		},

		{
			name:     "Plugin not found in manager",
			pluginID: 999,
			setupMocks: func(mock sqlmock.Sqlmock) {
				// Plugin manager has no such plugin, no SQL expected
			},
			setupPlugin: func(manager *plugins.PluginManager, registry *plugins.PluginRegistry) *plugins.Plugin {
				// Don't register the plugin
				return nil
			},
			expectedCode: http.StatusPartialContent, // 206 - Plugin not found
			expectedBody: `{"error":"Plugin not found"}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testDB, mock, err := sqlmock.New()
			require.NoError(t, err)
			defer testDB.Close()
			database.DB = testDB

			gin.SetMode(gin.TestMode)
			router := gin.Default()

			prevManager := api.GetGlobalPluginManager()
			prevRegistry := api.GetGlobalPluginRegistry()

			testManager := plugins.NewPluginManager(router)
			testRegistry := plugins.NewPluginRegistry("./test_plugins", testManager)
			api.SetGlobalPluginManager(testManager, testRegistry)

			// Set up Wazero runtime & dummy module (needed for registration)
			runtime := wazero.NewRuntime(context.Background())
			wasmBytes := []byte{0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00}
			compiledModule, err := runtime.CompileModule(context.Background(), wasmBytes)
			require.NoError(t, err)
			testModule, err := runtime.InstantiateModule(context.Background(), compiledModule, wazero.NewModuleConfig())
			require.NoError(t, err)

			t.Cleanup(func() {
				api.SetGlobalPluginManager(prevManager, prevRegistry)
				_ = os.RemoveAll("./test_plugins")
				_ = runtime.Close(context.Background())
			})

			router.DELETE("/api/plugins/:id", api.UninstallPluginHandler)

			// Setup SQL mock expectations
			tt.setupMocks(mock)

			// Setup plugin if needed
			if plugin := tt.setupPlugin(testManager, testRegistry); plugin != nil {
				plugin.Instance = testModule
			}

			// Make DELETE request
			req, err := http.NewRequest(http.MethodDelete, fmt.Sprintf("/api/plugins/%d", tt.pluginID), nil)
			require.NoError(t, err)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			require.Equal(t, tt.expectedCode, w.Code)
			// require.JSONEq(t, tt.expectedBody, w.Body.String())
			require.NoError(t, mock.ExpectationsWereMet())
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
			name: "Valid feedback submission to nonexistent plugin",
			requestBody: map[string]interface{}{
				"pluginId": 123456789,
				"rating":   4.5,
				"comments": "Great plugin!",
			},
			expectedStatus: http.StatusNotFound,
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
