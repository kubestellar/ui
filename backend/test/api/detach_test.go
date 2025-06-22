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

func TestDetachClusterHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid cluster detachment request",
			requestBody: map[string]interface{}{
				"clusterName": "test-cluster",
			},
			expectedStatus: http.StatusNotFound, // Expected to fail in test environment - cluster not found
		},
		{
			name: "Missing cluster name",
			requestBody: map[string]interface{}{
				"invalidField": "value",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload, clusterName is required",
		},
		{
			name: "Empty cluster name",
			requestBody: map[string]interface{}{
				"clusterName": "",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Cluster name is required",
		},
		{
			name:           "Invalid request body",
			requestBody:    nil,
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload, clusterName is required",
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
			req, _ := http.NewRequest(http.MethodPost, "/clusters/detach", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			c.Request = req

			// Call the handler
			api.DetachClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}

			if tt.expectedStatus == http.StatusOK {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
				assert.Contains(t, w.Body.String(), "is being detached")
			}
		})
	}
}

func TestGetDetachmentLogsHandler(t *testing.T) {
	tests := []struct {
		name           string
		clusterName    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid cluster name",
			clusterName:    "test-cluster",
			expectedStatus: http.StatusNotFound, // Expected - no detachment data exists
			expectedError:  "No detachment data found for cluster",
		},
		{
			name:           "Empty cluster name",
			clusterName:    "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Cluster name is required",
		},
		{
			name:           "Non-existent cluster",
			clusterName:    "non-existent-cluster",
			expectedStatus: http.StatusNotFound,
			expectedError:  "No detachment data found for cluster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set cluster name in URL params
			c.Params = []gin.Param{
				{Key: "cluster", Value: tt.clusterName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/clusters/detach/logs/"+tt.clusterName, nil)
			c.Request = req

			// Call the handler
			api.GetDetachmentLogsHandler(c)

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

// Note: WebSocket handlers are more complex to test and would require special setup
// For now, we'll focus on the main HTTP handlers. WebSocket testing would require
// additional tools and setup to properly test the WebSocket connections.

func TestDetachClusterHandler_EdgeCases(t *testing.T) {
	tests := []struct {
		name           string
		contentType    string
		requestBody    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Invalid content type",
			contentType:    "text/plain",
			requestBody:    "clusterName=test-cluster",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload",
		},
		{
			name:           "Malformed JSON",
			contentType:    "application/json",
			requestBody:    `{"clusterName": "test-cluster"`,
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

			// Create request with specific content type and body
			req, _ := http.NewRequest(http.MethodPost, "/clusters/detach", bytes.NewBufferString(tt.requestBody))
			req.Header.Set("Content-Type", tt.contentType)
			c.Request = req

			// Call the handler
			api.DetachClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}
