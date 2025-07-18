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
	testDB, mock, err := sqlmock.New()
	assert.NoError(t, err)
	defer testDB.Close()

	database.DB = testDB

	gin.SetMode(gin.TestMode)
	router := gin.Default()

	prevManager := api.GetGlobalPluginManager()
	prevRegistry := api.GetGlobalPluginRegistry()

	testManager := plugins.NewPluginManager(router)
	testRegistry := plugins.NewPluginRegistry("./test_plugins", testManager)
	api.SetGlobalPluginManager(testManager, testRegistry)

	// Set up a real wazero runtime and module
	runtime := wazero.NewRuntime(context.Background())

	// Create a dummy module using wazero's minimal WASM binary for testing
	wasmBytes := []byte{
		0x00, 0x61, 0x73, 0x6d, // WASM binary magic
		0x01, 0x00, 0x00, 0x00, // WASM binary version
	}
	compiledModule, err := runtime.CompileModule(context.Background(), wasmBytes)
	require.NoError(t, err)
	testModule, err := runtime.InstantiateModule(context.Background(), compiledModule, wazero.NewModuleConfig())
	require.NoError(t, err)

	// Cleanup
	t.Cleanup(func() {
		api.SetGlobalPluginManager(prevManager, prevRegistry)
		os.RemoveAll("./test_plugins")

		_ = runtime.Close(context.Background()) // ensure cleanup
	})

	// Set up route
	router.DELETE("/api/plugins/:id", api.UninstallPluginHandler)

	plugin := &plugins.Plugin{
		ID: 0, // will be assigned after RegisterPlugin
		Manifest: &plugins.PluginManifest{
			Metadata: plugins.PluginMetadata{
				Name:        "TestPlugin",
				Version:     "v0.1.0",
				Description: "Temporary test plugin",
			},
		},
		Instance: testModule,
		Status:   "active",
	}

	// --- MOCKING DB BEHAVIOR ---

	// 1. Mock CheckPluginWithInfo
	mock.ExpectQuery(`SELECT EXISTS\s+\(.*FROM plugin.*\)`).
		WithArgs(plugin.Manifest.Metadata.Name, plugin.Manifest.Metadata.Version, plugin.Manifest.Metadata.Description).
		WillReturnRows(sqlmock.NewRows([]string{"exists"}).AddRow(false))

	// 2. Mock AddPluginToDB to return ID = 9999
	mock.ExpectQuery(`INSERT INTO plugin .* RETURNING id`).
		WithArgs(plugin.Manifest.Metadata.Name, plugin.Manifest.Metadata.Version, true, plugin.Manifest.Metadata.Description, 0, "active").
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(9999))

	// Register plugin
	testManager.RegisterPlugin(plugin)
	plugin.ID = 9999

	// Create dummy plugin directory to simulate plugin files
	pluginFolder := fmt.Sprintf("%s-%d", plugin.Manifest.Metadata.Name, plugin.ID)
	pluginDir := filepath.Join(testRegistry.GetPluginsDirectory(), pluginFolder)
	err = os.MkdirAll(pluginDir, 0755)
	require.NoError(t, err)

	// Create a dummy plugin.wasm file
	wasmFilePath := filepath.Join(pluginDir, "plugin.wasm")
	err = os.WriteFile(wasmFilePath, []byte("dummy wasm content"), 0644)
	require.NoError(t, err)

	// 3. Mock actual DELETE FROM plugin
	mock.ExpectExec(`DELETE FROM plugin WHERE id = \$1`).
		WithArgs(9999).
		WillReturnResult(sqlmock.NewResult(0, 1)) // pretend one row was affected

	// Send DELETE request
	req, err := http.NewRequest(http.MethodDelete, "/api/plugins/9999", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	require.Equal(t, http.StatusOK, w.Code)
	require.JSONEq(t, `{"message": "Plugin uninstalled successfully"}`, w.Body.String())

	// Check plugin removed from manager
	_, exists := testManager.GetPlugin(9999)
	require.False(t, exists)

	// Verify all SQL expectations were met
	require.NoError(t, mock.ExpectationsWereMet())
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
