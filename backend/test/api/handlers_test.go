package api_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/stretchr/testify/assert"
)

func TestGetClusterStatusHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Get cluster status",
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
			req, _ := http.NewRequest(http.MethodGet, "/clusters/status", nil)
			c.Request = req

			// Call the handler
			api.GetClusterStatusHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestOnboardClusterHandler_JSON(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid JSON request with cluster name only",
			requestBody: map[string]interface{}{
				"clusterName": "test-cluster",
				"kubeconfig":  "",
			},
			expectedStatus: http.StatusBadRequest, // Expected to fail - cluster not in kubeconfig
			expectedError:  "Failed to find cluster",
		},
		{
			name: "Missing cluster name",
			requestBody: map[string]interface{}{
				"kubeconfig": "test-config",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "ClusterName is required",
		},
		{
			name:           "Empty request body",
			requestBody:    map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "ClusterName is required",
		},
		{
			name: "Valid JSON request with kubeconfig",
			requestBody: map[string]interface{}{
				"clusterName": "test-cluster-2",
				"kubeconfig":  "apiVersion: v1\nkind: Config\nclusters:\n- name: test\n  cluster:\n    server: https://test.com",
			},
			expectedStatus: http.StatusOK, // Should accept and start onboarding
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
			req, _ := http.NewRequest(http.MethodPost, "/clusters/onboard", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.OnboardClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}

			if tt.expectedStatus == http.StatusOK {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
				responseBody := w.Body.String()
				assert.True(t,
					strings.Contains(responseBody, "is being onboarded") ||
						strings.Contains(responseBody, "is already onboarded"),
					"Expected onboarding message in response: %s", responseBody)
			}
		})
	}
}

func TestOnboardClusterHandler_FormData(t *testing.T) {
	tests := []struct {
		name           string
		clusterName    string
		fileContent    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid form data with cluster name only",
			clusterName:    "test-cluster",
			fileContent:    "",
			expectedStatus: http.StatusBadRequest, // Expected to fail - cluster not in kubeconfig
			expectedError:  "Failed to find cluster",
		},
		{
			name:           "Missing cluster name and file",
			clusterName:    "",
			fileContent:    "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Failed to retrieve kubeconfig file",
		},
		{
			name:           "Valid form with kubeconfig file",
			clusterName:    "test-cluster-form",
			fileContent:    "apiVersion: v1\nkind: Config",
			expectedStatus: http.StatusOK, // Should accept
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create multipart form
			body := &bytes.Buffer{}
			writer := multipart.NewWriter(body)

			// Add cluster name field
			if tt.clusterName != "" {
				writer.WriteField("name", tt.clusterName)
			}

			// Add file if content provided
			if tt.fileContent != "" {
				part, _ := writer.CreateFormFile("kubeconfig", "config")
				part.Write([]byte(tt.fileContent))
			}

			writer.Close()

			req, _ := http.NewRequest(http.MethodPost, "/clusters/onboard", body)
			req.Header.Set("Content-Type", writer.FormDataContentType())
			c.Request = req

			// Call the handler
			api.OnboardClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}

			if tt.expectedStatus == http.StatusOK {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
			}
		})
	}
}

func TestUpdateManagedClusterLabelsHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid request",
			requestBody: map[string]interface{}{
				"contextName": "test-context",
				"clusterName": "test-cluster",
				"labels": map[string]string{
					"env": "test",
				},
			},
			expectedStatus: http.StatusInternalServerError, // Expected to fail - no valid k8s context
		},
		{
			name: "Missing context name",
			requestBody: map[string]interface{}{
				"clusterName": "test-cluster",
				"labels": map[string]string{
					"env": "test",
				},
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "contextName and clusterName are required",
		},
		{
			name: "Missing cluster name",
			requestBody: map[string]interface{}{
				"contextName": "test-context",
				"labels": map[string]string{
					"env": "test",
				},
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "contextName and clusterName are required",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload",
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
			req, _ := http.NewRequest(http.MethodPut, "/clusters/labels", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.UpdateManagedClusterLabelsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}
