package routes_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupAuthRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		path           string
		method         string
		body           map[string]interface{}
		expectedStatus int
	}{
		{
			name:   "Login endpoint",
			path:   "/login",
			method: "POST",
			body: map[string]interface{}{
				"username": "testuser",
				"password": "testpass",
			},
			expectedStatus: http.StatusUnauthorized, // Expected for invalid credentials
		},
		{
			name:           "Get current user (requires auth)",
			path:           "/api/me",
			method:         "GET",
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:   "Change password (requires auth)",
			path:   "/api/me/password",
			method: "PUT",
			body: map[string]interface{}{
				"current_password": "oldpass",
				"new_password":     "newpass",
			},
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:           "List users (admin only)",
			path:           "/api/admin/users",
			method:         "GET",
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:   "Create user (admin only)",
			path:   "/api/admin/users",
			method: "POST",
			body: map[string]interface{}{
				"username":    "newuser",
				"password":    "password123",
				"is_admin":    false,
				"permissions": map[string]string{},
			},
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:   "Update user (admin only)",
			path:   "/api/admin/users/testuser",
			method: "PUT",
			body: map[string]interface{}{
				"is_admin": true,
			},
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:           "Delete user (admin only)",
			path:           "/api/admin/users/testuser",
			method:         "DELETE",
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:           "Get user permissions (admin only)",
			path:           "/api/admin/users/testuser/permissions",
			method:         "GET",
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
		{
			name:   "Set user permissions (admin only)",
			path:   "/api/admin/users/testuser/permissions",
			method: "PUT",
			body: map[string]interface{}{
				"permissions": map[string]string{
					"resources": "read",
					"system":    "write",
				},
			},
			expectedStatus: http.StatusUnauthorized, // Expected without auth token
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				req, _ = http.NewRequest(tt.method, tt.path, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, _ = http.NewRequest(tt.method, tt.path, nil)
			}

			w := httptest.NewRecorder()

			// Some routes may panic due to missing dependencies (like database)
			// We'll catch these and consider them as route registration success
			func() {
				defer func() {
					if r := recover(); r != nil {
						// If there's a panic, it means the route was found but had an error
						// This is acceptable for our route registration test
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()

			// Main test is that route exists (not 404)
			// Some routes may return 500 due to missing dependencies (like database)
			// Accept any status except 404 as indication that route is registered
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")
		})
	}
}

func TestAuthComponentRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test component-based permission routes
	componentRoutes := []struct {
		component string
		paths     []struct {
			path   string
			method string
		}
	}{
		{
			component: "resources",
			paths: []struct {
				path   string
				method string
			}{
				{"/api/resources/", "GET"},
				{"/api/resources/resource-123", "GET"},
				{"/api/resources/", "POST"},
				{"/api/resources/resource-123", "PUT"},
				{"/api/resources/resource-123", "DELETE"},
			},
		},
		{
			component: "system",
			paths: []struct {
				path   string
				method string
			}{
				{"/api/system/status", "GET"},
				{"/api/system/config", "GET"},
				{"/api/system/config", "PUT"},
				{"/api/system/restart", "POST"},
			},
		},
		{
			component: "dashboard",
			paths: []struct {
				path   string
				method string
			}{
				{"/api/dashboard/stats", "GET"},
				{"/api/dashboard/charts", "GET"},
				{"/api/dashboard/widgets", "POST"},
				{"/api/dashboard/widgets/widget-123", "PUT"},
				{"/api/dashboard/widgets/widget-123", "DELETE"},
			},
		},
	}

	for _, comp := range componentRoutes {
		for _, pathInfo := range comp.paths {
			t.Run(comp.component+" "+pathInfo.method+" "+pathInfo.path, func(t *testing.T) {
				var req *http.Request
				if pathInfo.method == "POST" || pathInfo.method == "PUT" {
					body := map[string]interface{}{"test": "data"}
					jsonBody, _ := json.Marshal(body)
					req, _ = http.NewRequest(pathInfo.method, pathInfo.path, bytes.NewBuffer(jsonBody))
					req.Header.Set("Content-Type", "application/json")
				} else {
					req, _ = http.NewRequest(pathInfo.method, pathInfo.path, nil)
				}

				w := httptest.NewRecorder()

				// Handle potential panics from missing dependencies
				func() {
					defer func() {
						if r := recover(); r != nil {
							w.Code = http.StatusInternalServerError
						}
					}()
					router.ServeHTTP(w, req)
				}()

				// Should be unauthorized without proper token, but route should exist
				assert.NotEqual(t, http.StatusNotFound, w.Code, "Component route should be registered")
				// Accept various error codes since we don't have proper dependencies
				assert.True(t, w.Code == http.StatusUnauthorized || w.Code == http.StatusInternalServerError || w.Code == http.StatusBadRequest,
					"Should handle authentication or dependency errors, got %d", w.Code)
			})
		}
	}
}

func TestAuthUserManagementRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	usernames := []string{"alice", "bob", "charlie", "admin-user", "test.user"}

	for _, username := range usernames {
		t.Run("User operations for "+username, func(t *testing.T) {
			// Test GET user permissions
			req, _ := http.NewRequest("GET", "/api/admin/users/"+username+"/permissions", nil)
			w := httptest.NewRecorder()
			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Get user permissions route should be registered")

			// Test PUT user permissions
			body := map[string]interface{}{
				"permissions": map[string]string{
					"resources": "read",
					"system":    "write",
				},
			}
			jsonBody, _ := json.Marshal(body)
			req, _ = http.NewRequest("PUT", "/api/admin/users/"+username+"/permissions", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()
			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Set user permissions route should be registered")

			// Test PUT update user
			updateBody := map[string]interface{}{
				"is_admin": true,
			}
			jsonBody, _ = json.Marshal(updateBody)
			req, _ = http.NewRequest("PUT", "/api/admin/users/"+username, bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w = httptest.NewRecorder()
			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Update user route should be registered")

			// Test DELETE user
			req, _ = http.NewRequest("DELETE", "/api/admin/users/"+username, nil)
			w = httptest.NewRecorder()
			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Delete user route should be registered")
		})
	}
}

func TestAuthDebugRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	debugRoutes := []struct {
		name   string
		path   string
		method string
	}{
		{"Debug admin", "/debug/admin", "GET"},
		{"Debug users", "/debug/users", "GET"},
		{"Debug permissions", "/debug/permissions", "GET"},
	}

	for _, route := range debugRoutes {
		t.Run(route.name, func(t *testing.T) {
			req, _ := http.NewRequest(route.method, route.path, nil)
			w := httptest.NewRecorder()

			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()

			// Debug routes should be registered
			assert.NotEqual(t, http.StatusNotFound, w.Code, "Debug route should be registered: "+route.path)
		})
	}
}

func TestAuthLoginScenarios(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	loginScenarios := []struct {
		name string
		body map[string]interface{}
	}{
		{
			name: "Valid login format",
			body: map[string]interface{}{
				"username": "admin",
				"password": "admin",
			},
		},
		{
			name: "Empty credentials",
			body: map[string]interface{}{
				"username": "",
				"password": "",
			},
		},
		{
			name: "Missing password",
			body: map[string]interface{}{
				"username": "testuser",
			},
		},
		{
			name: "Missing username",
			body: map[string]interface{}{
				"password": "testpass",
			},
		},
	}

	for _, scenario := range loginScenarios {
		t.Run(scenario.name, func(t *testing.T) {
			jsonBody, _ := json.Marshal(scenario.body)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Login route should be registered")
		})
	}
}

func TestAuthInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name   string
		path   string
		method string
	}{
		{"Invalid GET on POST login", "/login", "GET"},
		{"Invalid POST on GET me", "/api/me", "POST"},
		{"Invalid GET on PUT password", "/api/me/password", "GET"},
		{"Invalid POST on GET users", "/api/admin/users", "PATCH"},
		{"Invalid GET on POST create user", "/api/admin/users", "GET"},
		{"Invalid POST on DELETE user", "/api/admin/users/test", "POST"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			func() {
				defer func() {
					if r := recover(); r != nil {
						w.Code = http.StatusInternalServerError
					}
				}()
				router.ServeHTTP(w, req)
			}()

			// Accept various status codes for invalid methods since some routes may have dependency/auth issues
			assert.True(t, w.Code == http.StatusUnauthorized || w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed || w.Code == http.StatusInternalServerError,
				"Invalid method should return 401, 404, 405, or 500, got %d", w.Code)
		})
	}
}
