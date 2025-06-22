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
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid deployment request",
			requestBody: map[string]interface{}{
				"repo_url":       "https://github.com/test/repo.git",
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			expectedStatus: http.StatusInternalServerError, // Fails due to missing Redis/K8s
		},
		{
			name: "Missing repo_url",
			requestBody: map[string]interface{}{
				"filepath": "manifests/app.yaml",
				"branch":   "main",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request body", // Match validation error format
		},
		{
			name: "Invalid GitHub URL",
			requestBody: map[string]interface{}{
				"repo_url":       "invalid-url",
				"folder_path":    "manifests",
				"workload_label": "test-app",
			},
			expectedStatus: http.StatusBadRequest, // Invalid URL format validation
		},
		{
			name: "Valid request with dry run",
			requestBody: map[string]interface{}{
				"repo_url":       "https://github.com/test/repo.git",
				"folder_path":    "manifests",
				"workload_label": "test-app",
				"dry_run":        true,
			},
			expectedStatus: http.StatusInternalServerError, // Fails due to missing services
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
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
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
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
	}{
		{
			name: "Valid webhook payload",
			requestBody: map[string]interface{}{
				"repository": map[string]interface{}{
					"full_name": "test/repo",
					"clone_url": "https://github.com/test/repo.git",
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
			expectedStatus: http.StatusNotFound, // No deployment configured in Redis
		},
		{
			name:           "Invalid webhook payload",
			requestBody:    map[string]interface{}{"invalid": "data"},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty webhook payload",
			requestBody:    map[string]interface{}{},
			expectedStatus: http.StatusBadRequest, // Missing repository info
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request body
			jsonBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPost, "/webhook", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.GitHubWebhookHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
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
			expectedStatus: http.StatusServiceUnavailable, // No k8s context available
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
			deploymentID:   "test-deployment-123",
			expectedStatus: http.StatusInternalServerError, // k8s unavailable in test
		},
		{
			name:           "Empty deployment ID",
			deploymentID:   "",
			expectedStatus: http.StatusBadRequest, // Invalid deployment ID
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
			req, _ := http.NewRequest(http.MethodGet, "/deployments/"+tt.deploymentID, nil)
			c.Request = req

			// Call the handler
			api.DeploymentStatusHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
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
			expectedStatus: http.StatusInternalServerError, // No k8s context available
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
		})
	}
}

func TestDeleteDeploymentHandler(t *testing.T) {
	tests := []struct {
		name           string
		deploymentID   string
		expectedStatus int
	}{
		{
			name:           "Valid deployment ID",
			deploymentID:   "test-deployment-123",
			expectedStatus: http.StatusInternalServerError, // No k8s context available
		},
		{
			name:           "Empty deployment ID",
			deploymentID:   "",
			expectedStatus: http.StatusBadRequest,
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
			expectedStatus: http.StatusBadRequest, // Invalid request
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request
			req, _ := http.NewRequest(http.MethodPost, "/validate", nil)
			c.Request = req

			// Call the handler
			api.ValidateConfigHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
