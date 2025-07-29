package api_test

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
				"contextName": "its1",
			},
			expectedStatus: http.StatusInternalServerError, // No k8s context available
		},
		{
			name: "Missing cluster name",
			requestBody: map[string]interface{}{
				"contextName": "its1",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload",
		},
		{
			name: "Empty cluster name",
			requestBody: map[string]interface{}{
				"clusterName": "",
				"contextName": "its1",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid request payload, clusterName is required", // Match actual error
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
			req, _ := http.NewRequest(http.MethodPost, "/clusters/detach", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			c.Request = req

			// Call the handler
			api.DetachClusterHandler(c)

			// For valid cluster detachment request, accept both 404 (not found) and 500 (internal server error)
			if tt.name == "Valid cluster detachment request" {
				assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusInternalServerError,
					"Expected 404 or 500 for valid cluster detachment request, got %d", w.Code)
			} else {
				assert.Equal(t, tt.expectedStatus, w.Code)
			}

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestGetDetachmentLogsHandler(t *testing.T) {
	tests := []struct {
		name           string
		clusterName    string
		expectedStatus int
	}{
		{
			name:           "Valid cluster name",
			clusterName:    "detach-test-cluster-unique",
			expectedStatus: http.StatusNotFound, // No events exist for this unique cluster name
		},
		{
			name:           "Empty cluster name",
			clusterName:    "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Non-existent cluster",
			clusterName:    "non-existent-cluster",
			expectedStatus: http.StatusNotFound, // No data found for non-existent cluster
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
		body           string
		expectedStatus int
	}{
		{
			name:           "Invalid content type",
			contentType:    "text/plain",
			body:           "invalid body",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Malformed JSON",
			contentType:    "application/json",
			body:           `{"clusterName": "test", "invalid": }`,
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create request with specific content type and body
			req, _ := http.NewRequest(http.MethodPost, "/clusters/detach", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", tt.contentType)
			c.Request = req

			// Call the handler
			api.DetachClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
