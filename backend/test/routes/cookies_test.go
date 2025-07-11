package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupWdsCookiesRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Setup WDS cookies routes using reflection since the function is not exported
	// We'll test the route existence by making requests
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		method         string
		url            string
		body           interface{}
		expectedStatus int
		description    string
	}{
		{
			name:           "POST set WDS context",
			method:         "POST",
			url:            "/wds/set/context",
			body:           map[string]interface{}{"context": "wds1"},
			expectedStatus: 200,
			description:    "Should handle setting WDS context",
		},
		{
			name:           "GET WDS context",
			method:         "GET",
			url:            "/wds/get/context",
			expectedStatus: 200,
			description:    "Should handle getting WDS context",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				req = httptest.NewRequest(tt.method, tt.url, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.url, nil)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// For route registration tests, we just want to ensure the route exists (not 404)
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")
		})
	}
}

func TestWdsCookiesInvalidMethod(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test invalid method on POST endpoint
	req1 := httptest.NewRequest("GET", "/wds/set/context", nil)
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	// Since the routes are registered with specific methods, using wrong method should return 404 or 405
	// Accept both 404 and 405 as valid responses for invalid methods
	assert.True(t, w1.Code == http.StatusNotFound || w1.Code == http.StatusMethodNotAllowed,
		"Invalid method should return 404 or 405, got %d", w1.Code)

	// Test invalid method on GET endpoint
	req2 := httptest.NewRequest("POST", "/wds/get/context", nil)
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	// Accept both 404 and 405 as valid responses for invalid methods
	assert.True(t, w2.Code == http.StatusNotFound || w2.Code == http.StatusMethodNotAllowed,
		"Invalid method should return 404 or 405, got %d", w2.Code)
}
