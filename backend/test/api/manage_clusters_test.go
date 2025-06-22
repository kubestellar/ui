package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/stretchr/testify/assert"
)

func TestGetManagedClustersHandler(t *testing.T) {
	tests := []struct {
		name           string
		context        string
		expectedStatus int
		expectError    bool
	}{
		{
			name:           "Default context",
			context:        "",
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
			expectError:    true,
		},
		{
			name:           "Custom context",
			context:        "test-context",
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request with context query parameter
			req, _ := http.NewRequest(http.MethodGet, "/clusters", nil)
			if tt.context != "" {
				q := req.URL.Query()
				q.Add("context", tt.context)
				req.URL.RawQuery = q.Encode()
			}
			c.Request = req

			// Call the handler
			api.GetManagedClustersHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectError {
				assert.Contains(t, w.Body.String(), "error")
			}
		})
	}
}

func TestGetManagedClusterHandler(t *testing.T) {
	tests := []struct {
		name           string
		clusterName    string
		context        string
		expectedStatus int
		expectError    bool
	}{
		{
			name:           "Empty cluster name",
			clusterName:    "",
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name:           "Special cluster name with 'selected clusters'",
			clusterName:    "selected clusters",
			expectedStatus: http.StatusOK,
			expectError:    false,
		},
		{
			name:           "Regular cluster name",
			clusterName:    "test-cluster",
			expectedStatus: http.StatusInternalServerError, // Expected to fail in test environment
			expectError:    true,
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
				{Key: "name", Value: tt.clusterName},
			}

			// Create a mock request
			req, _ := http.NewRequest(http.MethodGet, "/clusters/"+tt.clusterName, nil)
			if tt.context != "" {
				q := req.URL.Query()
				q.Add("context", tt.context)
				req.URL.RawQuery = q.Encode()
			}
			c.Request = req

			// Call the handler
			api.GetManagedClusterHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.expectError {
				assert.Contains(t, w.Body.String(), "error")
			}

			if tt.expectedStatus == http.StatusOK {
				assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
			}
		})
	}
}
