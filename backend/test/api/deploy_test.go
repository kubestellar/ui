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

func TestDeployHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		queryParams    map[string]string
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid deployment request",
			requestBody: map[string]interface{}{
				"repo_url":       "https://github.com/test/repo",
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
		},
		{
			name: "Missing repo_url",
			requestBody: map[string]interface{}{
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "repo_url is required",
		},
		{
			name: "Invalid GitHub URL",
			requestBody: map[string]interface{}{
				"repo_url":       "https://gitlab.com/test/repo",
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Only GitHub repositories are supported",
		},
		{
			name: "Valid request with dry run",
			requestBody: map[string]interface{}{
				"repo_url":       "https://github.com/test/repo",
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			queryParams: map[string]string{
				"dryRun": "true",
			},
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
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
			req, _ := http.NewRequest(http.MethodPost, "/deploy", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			// Add query parameters
			if tt.queryParams != nil {
				q := req.URL.Query()
				for key, value := range tt.queryParams {
					q.Add(key, value)
				}
				req.URL.RawQuery = q.Encode()
			}

			c.Request = req

			// Call the handler
			api.DeployHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestGitHubWebhookHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid webhook payload",
			requestBody: map[string]interface{}{
				"repository": map[string]interface{}{
					"clone_url": "https://github.com/test/repo.git",
					"full_name": "test/repo",
				},
				"ref": "refs/heads/main",
				"commits": []map[string]interface{}{
					{
						"id":       "abc123",
						"message":  "Update manifest",
						"url":      "https://github.com/test/repo/commit/abc123",
						"modified": []string{"manifests/app.yaml"},
						"added":    []string{},
						"removed":  []string{},
					},
				},
				"head_commit": map[string]interface{}{
					"id":      "abc123",
					"message": "Update manifest",
					"url":     "https://github.com/test/repo/commit/abc123",
				},
			},
			expectedStatus: http.StatusOK, // Should accept webhook but may fail during processing
		},
		{
			name:           "Invalid webhook payload",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty webhook payload",
			requestBody:    map[string]interface{}{},
			expectedStatus: http.StatusOK, // May accept but fail during processing
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
			req, _ := http.NewRequest(http.MethodPost, "/webhook/github", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.GitHubWebhookHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestHealthCheckHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Health check",
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
			req, _ := http.NewRequest(http.MethodGet, "/health", nil)
			c.Request = req

			// Call the handler
			api.HealthCheckHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestDeploymentStatusHandler(t *testing.T) {
	tests := []struct {
		name           string
		deploymentID   string
		expectedStatus int
	}{
		{
			name:           "Valid deployment ID",
			deploymentID:   "test-deployment-id",
			expectedStatus: http.StatusOK, // May return empty result but should not error
		},
		{
			name:           "Empty deployment ID",
			deploymentID:   "",
			expectedStatus: http.StatusOK, // May return empty result
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/deployments/status", nil)
			if tt.deploymentID != "" {
				q := req.URL.Query()
				q.Add("id", tt.deploymentID)
				req.URL.RawQuery = q.Encode()
			}
			c.Request = req

			// Call the handler
			api.DeploymentStatusHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestListDeploymentsHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "List deployments",
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
			req, _ := http.NewRequest(http.MethodGet, "/deployments", nil)
			c.Request = req

			// Call the handler
			api.ListDeploymentsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestDeleteDeploymentHandler(t *testing.T) {
	tests := []struct {
		name           string
		deploymentID   string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid deployment ID",
			deploymentID:   "test-deployment-id",
			expectedStatus: http.StatusOK, // May succeed even if deployment doesn't exist
		},
		{
			name:           "Empty deployment ID",
			deploymentID:   "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Deployment ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set deployment ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: tt.deploymentID},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodDelete, "/deployments/"+tt.deploymentID, nil)
			c.Request = req

			// Call the handler
			api.DeleteDeploymentHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestValidateConfigHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Validate config",
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
			req, _ := http.NewRequest(http.MethodGet, "/config/validate", nil)
			c.Request = req

			// Call the handler
			api.ValidateConfigHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}
