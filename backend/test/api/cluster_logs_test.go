package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
	"github.com/stretchr/testify/assert"
)

func TestOnboardingLogsHandler(t *testing.T) {
	tests := []struct {
		name           string
		clusterName    string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid cluster name",
			clusterName:    "test-cluster",
			expectedStatus: http.StatusNotFound,
			expectedError:  "No onboarding data found for cluster",
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
			expectedError:  "No onboarding data found for cluster",
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
			req, _ := http.NewRequest(http.MethodGet, "/clusters/onboard/logs/"+tt.clusterName, nil)
			c.Request = req

			// Call the handler
			api.OnboardingLogsHandler(c)

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
