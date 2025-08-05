package api_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/stretchr/testify/assert"
)

func TestCheckKubeStellarStatusHandler(t *testing.T) {
	tests := []struct {
		name           string
		expectedStatus int
	}{
		{
			name:           "Check KubeStellar Status",
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
			req, _ := http.NewRequest(http.MethodGet, "/status", nil)
			c.Request = req

			// Call the handler
			api.CheckKubeStellarStatusHandler(c)

			// Assertions
			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Header().Get("Content-Type"), "application/json")
		})
	}
}
