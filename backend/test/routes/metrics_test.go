package routes_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/routes"
	"github.com/stretchr/testify/assert"
)

func TestSetupMetricsRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	tests := []struct {
		name           string
		path           string
		method         string
		expectedStatus int
	}{
		{
			name:           "Get deployment metrics",
			path:           "/api/metrics/deployments",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get system metrics",
			path:           "/api/metrics/system",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get component health",
			path:           "/api/metrics/health",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get GitHub metrics",
			path:           "/api/metrics/github",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Helm metrics",
			path:           "/api/metrics/helm",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Redis metrics",
			path:           "/api/metrics/redis",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Get Kubernetes metrics",
			path:           "/api/metrics/kubernetes",
			method:         "GET",
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Route should be registered")
		})
	}
}

func TestMetricsEndpointCategories(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	categories := []struct {
		category string
		path     string
	}{
		{"Deployment Statistics", "/api/metrics/deployments"},
		{"System Metrics", "/api/metrics/system"},
		{"Component Health", "/api/metrics/health"},
		{"GitHub Metrics", "/api/metrics/github"},
		{"Helm Metrics", "/api/metrics/helm"},
		{"Redis Metrics", "/api/metrics/redis"},
		{"Kubernetes Metrics", "/api/metrics/kubernetes"},
	}

	for _, cat := range categories {
		t.Run(cat.category, func(t *testing.T) {
			req, _ := http.NewRequest("GET", cat.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, cat.category+" route should be registered")
		})
	}
}

func TestMetricsSystemHealthChecks(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test system health endpoint
	t.Run("System health check", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/metrics/health", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.NotEqual(t, http.StatusNotFound, w.Code, "Health check route should be registered")
	})

	// Test individual component metrics
	components := []string{
		"redis",
		"kubernetes",
		"github",
		"helm",
	}

	for _, component := range components {
		t.Run("Component metrics for "+component, func(t *testing.T) {
			path := "/api/metrics/" + component
			req, _ := http.NewRequest("GET", path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Component metrics route should be registered: "+path)
		})
	}
}

func TestMetricsDeploymentStatistics(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test deployment metrics with various query parameters
	deploymentMetricsTests := []struct {
		name   string
		path   string
		params string
	}{
		{
			name: "Basic deployment metrics",
			path: "/api/metrics/deployments",
		},
		{
			name:   "Deployment metrics with filter",
			path:   "/api/metrics/deployments",
			params: "?namespace=production",
		},
		{
			name:   "Deployment metrics with type filter",
			path:   "/api/metrics/deployments",
			params: "?type=github",
		},
		{
			name:   "Deployment metrics with status filter",
			path:   "/api/metrics/deployments",
			params: "?status=active",
		},
		{
			name:   "Deployment metrics with time range",
			path:   "/api/metrics/deployments",
			params: "?from=2024-01-01&to=2024-01-31",
		},
	}

	for _, test := range deploymentMetricsTests {
		t.Run(test.name, func(t *testing.T) {
			fullPath := test.path
			if test.params != "" {
				fullPath += test.params
			}

			req, _ := http.NewRequest("GET", fullPath, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "Deployment metrics route should be registered: "+fullPath)
		})
	}
}

func TestMetricsSystemDetails(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test system metrics with various query parameters
	systemMetricsTests := []struct {
		name   string
		path   string
		params string
	}{
		{
			name: "Basic system metrics",
			path: "/api/metrics/system",
		},
		{
			name:   "System metrics with components filter",
			path:   "/api/metrics/system",
			params: "?components=runtime,memory",
		},
		{
			name:   "System metrics with detailed view",
			path:   "/api/metrics/system",
			params: "?detailed=true",
		},
		{
			name:   "System metrics with format",
			path:   "/api/metrics/system",
			params: "?format=json",
		},
	}

	for _, test := range systemMetricsTests {
		t.Run(test.name, func(t *testing.T) {
			fullPath := test.path
			if test.params != "" {
				fullPath += test.params
			}

			req, _ := http.NewRequest("GET", fullPath, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "System metrics route should be registered: "+fullPath)
		})
	}
}

func TestMetricsIntegrationEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test integration-specific metrics
	integrationTests := []struct {
		name        string
		path        string
		integration string
	}{
		{
			name:        "GitHub integration metrics",
			path:        "/api/metrics/github",
			integration: "GitHub",
		},
		{
			name:        "Helm integration metrics",
			path:        "/api/metrics/helm",
			integration: "Helm",
		},
		{
			name:        "Redis integration metrics",
			path:        "/api/metrics/redis",
			integration: "Redis",
		},
		{
			name:        "Kubernetes integration metrics",
			path:        "/api/metrics/kubernetes",
			integration: "Kubernetes",
		},
	}

	for _, test := range integrationTests {
		t.Run(test.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", test.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, test.integration+" metrics route should be registered")
		})

		// Test with query parameters
		t.Run(test.name+" with parameters", func(t *testing.T) {
			path := test.path + "?detailed=true&format=json"
			req, _ := http.NewRequest("GET", path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, test.integration+" metrics route with params should be registered")
		})
	}
}

func TestMetricsInvalidMethods(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	invalidMethodTests := []struct {
		name   string
		method string
		url    string
	}{
		{"Invalid POST on GET deployments", "POST", "/api/metrics/deployments"},
		{"Invalid DELETE on GET system", "DELETE", "/api/metrics/system"},
		{"Invalid PUT on GET health", "PUT", "/api/metrics/health"},
		{"Invalid PATCH on GET github", "PATCH", "/api/metrics/github"},
		{"Invalid POST on GET helm", "POST", "/api/metrics/helm"},
		{"Invalid DELETE on GET redis", "DELETE", "/api/metrics/redis"},
		{"Invalid PUT on GET kubernetes", "PUT", "/api/metrics/kubernetes"},
	}

	for _, tt := range invalidMethodTests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.url, nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Since the routes are registered with specific methods, using wrong method should return 404 or 405
			// Accept both 404 and 405 as valid responses for invalid methods
			assert.True(t, w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed,
				"Invalid method should return 404 or 405, got %d", w.Code)
		})
	}
}

func TestMetricsHealthStatusCodes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	// Test health endpoint which might return different status codes based on system health
	t.Run("Health endpoint response", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/metrics/health", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Health endpoint should be registered and might return various status codes
		assert.NotEqual(t, http.StatusNotFound, w.Code, "Health route should be registered")
		// Health can return 200 (healthy), 503 (unhealthy), or 500 (error)
		validHealthCodes := []int{http.StatusOK, http.StatusServiceUnavailable, http.StatusInternalServerError}
		assert.Contains(t, validHealthCodes, w.Code, "Health endpoint should return valid health status code")
	})
}
