package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/stretchr/testify/assert"
)

// Note: WebSocket handlers are complex to test as they require WebSocket connection setup
// These tests focus on the HTTP request validation and initial connection handling

func TestWSOnboardingHandler(t *testing.T) {
	tests := []struct {
		name           string
		clusterQuery   string
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "Valid cluster parameter",
			clusterQuery:   "test-cluster",
			expectedStatus: http.StatusBadRequest, // Will fail upgrade without proper WebSocket headers
		},
		{
			name:           "Missing cluster parameter",
			clusterQuery:   "",
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Cluster name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			gin.SetMode(gin.TestMode)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			// Create a mock request with cluster query parameter
			req, _ := http.NewRequest(http.MethodGet, "/ws/onboarding", nil)
			if tt.clusterQuery != "" {
				q := req.URL.Query()
				q.Add("cluster", tt.clusterQuery)
				req.URL.RawQuery = q.Encode()
			}
			c.Request = req

			// Call the handler
			api.WSOnboardingHandler(c)

			// Note: Without proper WebSocket headers, this will fail with upgrade error
			// In a real WebSocket test, we would need to set proper headers and use WebSocket client
			if tt.expectedError != "" && tt.clusterQuery == "" {
				assert.Contains(t, w.Body.String(), tt.expectedError)
			}
		})
	}
}

func TestWSHealthHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "WebSocket health check",
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
			req, _ := http.NewRequest(http.MethodGet, "/ws/health", nil)
			c.Request = req

			// Call the handler
			api.WSHealthHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}

// Note: Removed WebSocket upgrade tests as they cause panics in test environment
// WebSocket upgrade requires a real HTTP hijacker which httptest.ResponseRecorder doesn't provide

// Test for utility functions from cluster_socket.go
func TestClusterSocketUtilityFunctions(t *testing.T) {
	t.Run("Test LogOnboardingEvent", func(t *testing.T) {
		// Test the LogOnboardingEvent function
		clusterName := "test-cluster"
		status := "Testing"
		message := "Test message"

		// This function doesn't return anything, so we just test it doesn't panic
		assert.NotPanics(t, func() {
			api.LogOnboardingEvent(clusterName, status, message)
		})
	})

	t.Run("Test GetOnboardingEvents", func(t *testing.T) {
		// Test getting events for a cluster
		clusterName := "test-cluster"

		// Should return empty slice for non-existent cluster
		events := api.GetOnboardingEvents(clusterName)
		assert.NotNil(t, events)
		assert.IsType(t, []api.OnboardingEvent{}, events)
	})

	t.Run("Test ClearOnboardingEvents", func(t *testing.T) {
		// Test clearing events for a cluster
		clusterName := "test-cluster"

		// This function doesn't return anything, so we just test it doesn't panic
		assert.NotPanics(t, func() {
			api.ClearOnboardingEvents(clusterName)
		})
	})

	t.Run("Test RegisterOnboardingStart", func(t *testing.T) {
		// Test registering onboarding start
		clusterName := "test-cluster"

		// This function doesn't return anything, so we just test it doesn't panic
		assert.NotPanics(t, func() {
			api.RegisterOnboardingStart(clusterName)
		})
	})

	t.Run("Test RegisterOnboardingComplete", func(t *testing.T) {
		// Test registering onboarding completion
		clusterName := "test-cluster"

		// Test with nil error (success)
		assert.NotPanics(t, func() {
			api.RegisterOnboardingComplete(clusterName, nil)
		})

		// Test with error
		testError := assert.AnError
		assert.NotPanics(t, func() {
			api.RegisterOnboardingComplete(clusterName, testError)
		})
	})
}
