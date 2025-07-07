package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"runtime"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/stretchr/testify/assert"
)

func TestCheckPrerequisitesHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Check prerequisites",
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
			req, _ := http.NewRequest(http.MethodGet, "/prerequisites", nil)
			c.Request = req

			// Call the handler
			api.CheckPrerequisitesHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestInstallHandler(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid kind platform",
			requestBody: map[string]interface{}{
				"platform": "kind",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Valid k3d platform",
			requestBody: map[string]interface{}{
				"platform": "k3d",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Invalid platform",
			requestBody: map[string]interface{}{
				"platform": "invalid",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Platform must be 'kind' or 'k3d'",
		},
		{
			name:           "Empty request body",
			requestBody:    map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Platform must be 'kind' or 'k3d'",
		},
		{
			name: "Missing platform",
			requestBody: map[string]interface{}{
				"invalid_field": "value",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Platform must be 'kind' or 'k3d'",
		},
		{
			name:           "Malformed JSON",
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
			var err error
			if tt.requestBody != nil {
				jsonBody, err = json.Marshal(tt.requestBody)
				assert.NoError(t, err)
			}

			req, _ := http.NewRequest(http.MethodPost, "/install", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			c.Request = req

			// Call the handler
			api.InstallHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}

			if tt.expectedStatus == http.StatusOK {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")

				// For Windows, check for specific response structure
				if runtime.GOOS == "windows" {
					assert.Contains(t, w.Body.String(), "windows")
				} else {
					assert.Contains(t, w.Body.String(), "installId")
				}
			}
		})
	}
}

func TestGetLogsHandler(t *testing.T) {
	tests := []struct {
		name           string
		installID      string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid install ID",
			installID:      "test-install-id",
			expectedStatus: http.StatusNotFound, // Assuming no logs exist for test ID
			expectedError:  "Installation ID not found",
		},
		{
			name:           "Empty install ID",
			installID:      "",
			expectedStatus: http.StatusNotFound,
			expectedError:  "Installation ID not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set install ID in URL params
			c.Params = []gin.Param{
				{Key: "id", Value: tt.installID},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/logs/"+tt.installID, nil)
			c.Request = req

			// Call the handler
			api.GetLogsHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}
