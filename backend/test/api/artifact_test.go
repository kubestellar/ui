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

func TestSearchArtifactHub(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid search query",
			requestBody: map[string]interface{}{
				"query": "nginx",
				"limit": 10,
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Empty search query",
			requestBody: map[string]interface{}{
				"query": "",
				"limit": 10,
			},
			expectedStatus: http.StatusOK, // Should return all packages or empty result
		},
		{
			name:           "Invalid request payload",
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

			// Create a mock request with JSON body
			var jsonBody []byte
			if tt.requestBody != nil {
				jsonBody, _ = json.Marshal(tt.requestBody)
			}
			req, _ := http.NewRequest(http.MethodPost, "/artifact-hub/search", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			c.Request = req

			// Call the handler
			api.SearchArtifactHub(c)

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

func TestGetArtifactHubPackageInfo(t *testing.T) {
	tests := []struct {
		name           string
		packageID      string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid package ID",
			packageID:      "bitnami/nginx/nginx",
			expectedStatus: http.StatusInternalServerError, // Will fail on external API call in test
		},
		{
			name:           "Empty package ID",
			packageID:      "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Package ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set package ID in URL params
			c.Params = []gin.Param{
				{Key: "packageId", Value: tt.packageID},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/artifact-hub/packages/"+tt.packageID, nil)
			c.Request = req

			// Call the handler
			api.GetArtifactHubPackageInfo(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestListArtifactHubRepositories(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "List repositories",
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
			req, _ := http.NewRequest(http.MethodGet, "/artifact-hub/repositories", nil)
			c.Request = req

			// Call the handler
			api.ListArtifactHubRepositories(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

func TestDeployFromArtifactHub(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Valid deployment request",
			requestBody: map[string]interface{}{
				"packageId":     "bitnami/nginx/nginx", // Proper format: repo/org/chartname
				"releaseName":   "my-release",
				"namespace":     "default",
				"version":       "1.0.0",
				"values":        map[string]interface{}{},
				"workloadLabel": "test-app",
			},
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
		},
		{
			name: "Invalid packageId format",
			requestBody: map[string]interface{}{
				"packageId":     "test-package", // Invalid format
				"releaseName":   "my-release",
				"namespace":     "default",
				"version":       "1.0.0",
				"workloadLabel": "test-app",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid packageId format",
		},
		{
			name: "Missing package ID",
			requestBody: map[string]interface{}{
				"releaseName":   "my-release",
				"namespace":     "default",
				"version":       "1.0.0",
				"workloadLabel": "test-app",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Invalid packageId format",
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
			req, _ := http.NewRequest(http.MethodPost, "/artifact-hub/deploy", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			c.Request = req

			// Call the handler
			api.DeployFromArtifactHub(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestGetArtifactHubPackageValues(t *testing.T) {
	tests := []struct {
		name           string
		packageID      string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid package ID",
			packageID:      "bitnami/nginx/nginx",
			expectedStatus: http.StatusInternalServerError, // Will fail on external API call
		},
		{
			name:           "Empty package ID",
			packageID:      "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Package ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set package ID in URL params
			c.Params = []gin.Param{
				{Key: "packageId", Value: tt.packageID},
			}

			// Create a mock request with package ID parameter
			req, _ := http.NewRequest(http.MethodGet, "/artifact-hub/package/values", nil)
			c.Request = req

			// Call the handler
			api.GetArtifactHubPackageValues(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestSearchArtifactHubAdvance(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name: "Advanced search with filters",
			requestBody: map[string]interface{}{
				"query": "nginx",
				"kind":  "0", // Use string "0" instead of "chart"
				"sort":  "relevance",
				"limit": 10,
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Empty advanced search",
			requestBody: map[string]interface{}{
				"query": "",
				"limit": 10,
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid request payload",
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

			// Create a mock request with JSON body
			var jsonBody []byte
			if tt.requestBody != nil {
				jsonBody, _ = json.Marshal(tt.requestBody)
			}
			req, _ := http.NewRequest(http.MethodPost, "/artifact-hub/search/advance", bytes.NewBuffer(jsonBody))
			if tt.requestBody != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			c.Request = req

			// Call the handler
			api.SearchArtifactHubAdvance(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			} else {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
			}
		})
	}
}

func TestGetArtifactHubPackageAdvanceDetails(t *testing.T) {
	tests := []struct {
		name           string
		packageID      string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid package ID for advance details",
			packageID:      "bitnami/nginx/nginx",
			expectedStatus: http.StatusInternalServerError, // Will fail on external API call
		},
		{
			name:           "Empty package ID for advance details",
			packageID:      "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Package ID is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Set package ID in URL params
			c.Params = []gin.Param{
				{Key: "packageId", Value: tt.packageID},
			}

			// Create a mock request with package ID parameter
			req, _ := http.NewRequest(http.MethodGet, "/artifact-hub/package/advance", nil)
			c.Request = req

			// Call the handler
			api.GetArtifactHubPackageAdvanceDetails(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectedError != "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}
