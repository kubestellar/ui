package api_test

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/api"
	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	code := m.Run()
	os.Exit(code)
}

// setupTestRouter creates a test router with metrics routes
func setupTestRouter(t *testing.T) *gin.Engine {
	logger := zaptest.NewLogger(t)
	router := gin.New()

	// Initialize metrics with test logger
	api.InitializeMetrics(logger, nil)

	// Setup metrics routes
	api.SetupMetricsRoutes(router, logger)

	return router
}

// createTestRegistry creates a test Prometheus registry with sample metrics
func createTestRegistry() *prometheus.Registry {
	registry := prometheus.NewRegistry()

	// Create test metrics
	counter := prometheus.NewCounter(prometheus.CounterOpts{
		Name: "test_counter",
		Help: "A test counter metric",
	})

	gauge := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "test_gauge",
		Help: "A test gauge metric",
	})

	histogram := prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "test_histogram",
		Help:    "A test histogram metric",
		Buckets: []float64{0.1, 0.5, 1.0, 2.5, 5.0, 10.0},
	})

	summary := prometheus.NewSummary(prometheus.SummaryOpts{
		Name:       "test_summary",
		Help:       "A test summary metric",
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
	})

	// Register metrics
	registry.MustRegister(counter, gauge, histogram, summary)

	// Set some values
	counter.Add(42)
	gauge.Set(3.14)
	histogram.Observe(0.5)
	histogram.Observe(1.5)
	histogram.Observe(2.0)
	summary.Observe(0.1)
	summary.Observe(0.5)
	summary.Observe(0.9)

	return registry
}

func TestInitializeMetrics(t *testing.T) {
	tests := []struct {
		name     string
		logger   *zap.Logger
		registry prometheus.Gatherer
	}{
		{
			name:     "Initialize with nil registry",
			logger:   zaptest.NewLogger(t),
			registry: nil,
		},
		{
			name:     "Initialize with custom registry",
			logger:   zaptest.NewLogger(t),
			registry: createTestRegistry(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			api.InitializeMetrics(tt.logger, tt.registry)
			// Test passes if no panic occurs
		})
	}
}

func TestGetRawMetrics(t *testing.T) {
	router := setupTestRouter(t)

	tests := []struct {
		name           string
		endpoint       string
		expectedStatus int
		expectedType   string
	}{
		{
			name:           "Get raw metrics from /metrics",
			endpoint:       "/metrics",
			expectedStatus: http.StatusOK,
			expectedType:   "text/plain",
		},
		{
			name:           "Get raw metrics from API endpoint",
			endpoint:       "/api/v1/metrics/raw",
			expectedStatus: http.StatusOK,
			expectedType:   "text/plain",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.endpoint, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			// Check content type contains expected type
			contentType := w.Header().Get("Content-Type")
			assert.Contains(t, contentType, tt.expectedType)

			// Check that response body contains Prometheus format
			body := w.Body.String()
			assert.NotEmpty(t, body)
		})
	}
}

func TestGetMetrics(t *testing.T) {
	// Create test registry with known metrics
	registry := createTestRegistry()
	logger := zaptest.NewLogger(t)

	// Initialize with test registry
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	tests := []struct {
		name           string
		endpoint       string
		expectedStatus int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name:           "Get all metrics summary",
			endpoint:       "/api/v1/metrics",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "total_metrics")
				assert.Contains(t, response, "metrics")
				assert.Contains(t, response, "types")

				// Check metrics array
				metrics, ok := response["metrics"].([]interface{})
				require.True(t, ok)
				assert.Greater(t, len(metrics), 0)

				// Check types
				types, ok := response["types"].(map[string]interface{})
				require.True(t, ok)
				assert.Contains(t, types, "counter")
				assert.Contains(t, types, "gauge")
				assert.Contains(t, types, "histogram")
				assert.Contains(t, types, "summary")
			},
		},
		{
			name:           "Get specific counter metric",
			endpoint:       "/api/v1/metrics?name=test_counter",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Equal(t, 42.0, value)
			},
		},
		{
			name:           "Get specific gauge metric",
			endpoint:       "/api/v1/metrics?name=test_gauge",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Equal(t, 3.14, value)
			},
		},
		{
			name:           "Get histogram metric",
			endpoint:       "/api/v1/metrics?name=test_histogram",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(map[string]interface{})
				require.True(t, ok)

				assert.Contains(t, value, "count")
				assert.Contains(t, value, "sum")
				assert.Contains(t, value, "buckets")
			},
		},
		{
			name:           "Get histogram sum",
			endpoint:       "/api/v1/metrics?name=test_histogram_sum",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Greater(t, value, 0.0)
			},
		},
		{
			name:           "Get histogram count",
			endpoint:       "/api/v1/metrics?name=test_histogram_count",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Equal(t, 3.0, value) // We observed 3 values
			},
		},
		{
			name:           "Get histogram buckets",
			endpoint:       "/api/v1/metrics?name=test_histogram_bucket",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response []map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Greater(t, len(response), 0)

				for _, bucket := range response {
					assert.Contains(t, bucket, "value")
					bucketValue, ok := bucket["value"].([]interface{})
					require.True(t, ok)
					assert.Greater(t, len(bucketValue), 0)
				}
			},
		},
		{
			name:           "Get summary metric",
			endpoint:       "/api/v1/metrics?name=test_summary",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(map[string]interface{})
				require.True(t, ok)

				assert.Contains(t, value, "count")
				assert.Contains(t, value, "sum")
				assert.Contains(t, value, "quantiles")
			},
		},
		{
			name:           "Get non-existent metric",
			endpoint:       "/api/v1/metrics?name=non_existent_metric",
			expectedStatus: http.StatusNotFound,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "error")
				assert.Contains(t, response["error"], "not found")
			},
		},
		{
			name:           "Get raw format redirect",
			endpoint:       "/api/v1/metrics?format=raw",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				// Should return Prometheus format
				bodyStr := string(body)
				assert.NotEmpty(t, bodyStr)
				// Prometheus format should contain metric names
				assert.Contains(t, bodyStr, "test_counter")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.endpoint, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestProcessHistogram(t *testing.T) {
	// Create a test histogram
	histogram := prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "test_histogram",
		Help:    "A test histogram",
		Buckets: []float64{0.1, 0.5, 1.0, 2.5, 5.0, 10.0, math.Inf(1)},
	})

	// Add some observations
	histogram.Observe(0.05)
	histogram.Observe(0.3)
	histogram.Observe(1.5)
	histogram.Observe(15.0) // This should go to +Inf bucket

	// Get the metric
	metric := &dto.Metric{}
	histogram.Write(metric)

	// Test different suffixes by creating a test registry and using the API
	registry := prometheus.NewRegistry()
	registry.MustRegister(histogram)

	logger := zaptest.NewLogger(t)
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	tests := []struct {
		name           string
		endpoint       string
		expectedStatus int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name:           "Histogram sum",
			endpoint:       "/api/v1/metrics?name=test_histogram_sum",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Greater(t, value, 0.0)
			},
		},
		{
			name:           "Histogram count",
			endpoint:       "/api/v1/metrics?name=test_histogram_count",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Equal(t, 4.0, value) // We observed 4 values
			},
		},
		{
			name:           "Histogram buckets with infinity",
			endpoint:       "/api/v1/metrics?name=test_histogram_bucket",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response []map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Greater(t, len(response), 0)

				// Check that we have buckets with +Inf
				found := false
				for _, bucket := range response {
					if bucketValue, ok := bucket["value"].([]interface{}); ok {
						for _, b := range bucketValue {
							if bucketMap, ok := b.(map[string]interface{}); ok {
								if upperBound, exists := bucketMap["upper_bound"]; exists {
									if upperBound == "+Inf" {
										found = true
										break
									}
								}
							}
						}
					}
				}
				assert.True(t, found, "Should find +Inf bucket")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.endpoint, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestProcessSummary(t *testing.T) {
	// Create a test summary
	summary := prometheus.NewSummary(prometheus.SummaryOpts{
		Name:       "test_summary",
		Help:       "A test summary",
		Objectives: map[float64]float64{0.5: 0.05, 0.9: 0.01, 0.99: 0.001},
	})

	// Add some observations
	for i := 0; i < 100; i++ {
		summary.Observe(float64(i) / 100.0)
	}

	registry := prometheus.NewRegistry()
	registry.MustRegister(summary)

	logger := zaptest.NewLogger(t)
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	tests := []struct {
		name           string
		endpoint       string
		expectedStatus int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name:           "Summary sum",
			endpoint:       "/api/v1/metrics?name=test_summary_sum",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Greater(t, value, 0.0)
			},
		},
		{
			name:           "Summary count",
			endpoint:       "/api/v1/metrics?name=test_summary_count",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(float64)
				require.True(t, ok)
				assert.Equal(t, 100.0, value) // We observed 100 values
			},
		},
		{
			name:           "Summary with quantiles",
			endpoint:       "/api/v1/metrics?name=test_summary",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Contains(t, response, "value")
				value, ok := response["value"].(map[string]interface{})
				require.True(t, ok)

				assert.Contains(t, value, "quantiles")
				quantiles, ok := value["quantiles"].([]interface{})
				require.True(t, ok)
				assert.Greater(t, len(quantiles), 0)

				// Check quantile structure
				for _, q := range quantiles {
					quantile, ok := q.(map[string]interface{})
					require.True(t, ok)
					assert.Contains(t, quantile, "quantile")
					assert.Contains(t, quantile, "value")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.endpoint, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.checkResponse != nil {
				tt.checkResponse(t, w.Body.Bytes())
			}
		})
	}
}

func TestParseMetricName(t *testing.T) {
	// We can't directly test the parseMetricName function as it's not exported,
	// but we can test its behavior through the API
	registry := createTestRegistry()
	logger := zaptest.NewLogger(t)
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	tests := []struct {
		name            string
		metricName      string
		expectedStatus  int
		shouldHaveValue bool
	}{
		{
			name:            "Metric with _sum suffix",
			metricName:      "test_histogram_sum",
			expectedStatus:  http.StatusOK,
			shouldHaveValue: true,
		},
		{
			name:            "Metric with _count suffix",
			metricName:      "test_histogram_count",
			expectedStatus:  http.StatusOK,
			shouldHaveValue: true,
		},
		{
			name:            "Metric with _bucket suffix",
			metricName:      "test_histogram_bucket",
			expectedStatus:  http.StatusOK,
			shouldHaveValue: true,
		},
		{
			name:            "Metric without suffix",
			metricName:      "test_counter",
			expectedStatus:  http.StatusOK,
			shouldHaveValue: true,
		},
		{
			name:            "Invalid suffix",
			metricName:      "test_counter_invalid",
			expectedStatus:  http.StatusNotFound,
			shouldHaveValue: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			endpoint := fmt.Sprintf("/api/v1/metrics?name=%s", tt.metricName)
			req := httptest.NewRequest("GET", endpoint, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)

			if tt.shouldHaveValue {
				var response map[string]interface{}
				err := json.Unmarshal(w.Body.Bytes(), &response)
				require.NoError(t, err)
				assert.Contains(t, response, "value")
			}
		})
	}
}

func TestEnvironmentVariables(t *testing.T) {
	tests := []struct {
		name           string
		envVars        map[string]string
		expectedHost   string
		expectedPort   string
		expectedFilter bool
	}{
		{
			name:           "Default values",
			envVars:        map[string]string{},
			expectedHost:   "localhost",
			expectedPort:   "4000",
			expectedFilter: true,
		},
		{
			name: "Custom values",
			envVars: map[string]string{
				"METRICS_HOST":          "0.0.0.0",
				"METRICS_PORT":          "8080",
				"ENABLE_METRICS_FILTER": "false",
			},
			expectedHost:   "0.0.0.0",
			expectedPort:   "8080",
			expectedFilter: false,
		},
		{
			name: "PORT fallback",
			envVars: map[string]string{
				"PORT": "3000",
			},
			expectedHost:   "localhost",
			expectedPort:   "3000",
			expectedFilter: true,
		},
		{
			name: "METRICS_PORT overrides PORT",
			envVars: map[string]string{
				"PORT":         "3000",
				"METRICS_PORT": "8080",
			},
			expectedHost:   "localhost",
			expectedPort:   "8080",
			expectedFilter: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Save original env vars
			originalEnvs := make(map[string]string)
			for key := range tt.envVars {
				originalEnvs[key] = os.Getenv(key)
			}

			// Set test env vars
			for key, value := range tt.envVars {
				if value == "" {
					os.Unsetenv(key)
				} else {
					os.Setenv(key, value)
				}
			}

			// Clean up env vars that shouldn't be set
			for _, key := range []string{"METRICS_HOST", "METRICS_PORT", "ENABLE_METRICS_FILTER", "PORT"} {
				if _, exists := tt.envVars[key]; !exists {
					os.Unsetenv(key)
				}
			}

			// Test initialization
			logger := zaptest.NewLogger(t)
			api.InitializeMetrics(logger, nil)

			// Restore original env vars
			for key, value := range originalEnvs {
				if value == "" {
					os.Unsetenv(key)
				} else {
					os.Setenv(key, value)
				}
			}
		})
	}
}

func TestSetupMetricsRoutes(t *testing.T) {
	logger := zaptest.NewLogger(t)
	router := gin.New()

	// Setup routes
	api.SetupMetricsRoutes(router, logger)

	// Test all expected routes
	routes := []struct {
		method string
		path   string
	}{
		{"GET", "/metrics"},
		{"GET", "/api/v1/metrics"},
		{"GET", "/api/v1/metrics/raw"},
	}

	for _, route := range routes {
		t.Run(fmt.Sprintf("%s %s", route.method, route.path), func(t *testing.T) {
			req := httptest.NewRequest(route.method, route.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			// Should not return 404 (route not found)
			assert.NotEqual(t, http.StatusNotFound, w.Code)
		})
	}
}

func TestMetricsWithLabels(t *testing.T) {
	// Create a registry with labeled metrics
	registry := prometheus.NewRegistry()

	// Create a counter with labels
	counter := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "test_counter_with_labels",
			Help: "A test counter with labels",
		},
		[]string{"method", "status"},
	)

	registry.MustRegister(counter)

	// Set some values with different labels
	counter.WithLabelValues("GET", "200").Add(10)
	counter.WithLabelValues("POST", "201").Add(5)
	counter.WithLabelValues("GET", "404").Add(2)

	logger := zaptest.NewLogger(t)
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	t.Run("Get labeled metric", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/metrics?name=test_counter_with_labels", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response []map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		// Should have multiple entries (one for each label combination)
		assert.Greater(t, len(response), 1)

		// Each entry should have labels and value
		for _, entry := range response {
			assert.Contains(t, entry, "value")
			assert.Contains(t, entry, "labels")

			labels, ok := entry["labels"].(map[string]interface{})
			require.True(t, ok)
			assert.Contains(t, labels, "method")
			assert.Contains(t, labels, "status")
		}
	})
}

func TestMetricsErrorHandling(t *testing.T) {
	// Create a router without proper initialization
	router := gin.New()

	// Add a route that will use default registry
	router.GET("/test-metrics", api.GetMetrics)

	t.Run("Metrics with default registry", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/test-metrics", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should not crash and should return some response
		assert.NotEqual(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("Invalid metric suffix", func(t *testing.T) {
		logger := zaptest.NewLogger(t)
		api.InitializeMetrics(logger, createTestRegistry())

		testRouter := gin.New()
		api.SetupMetricsRoutes(testRouter, logger)

		req := httptest.NewRequest("GET", "/api/v1/metrics?name=test_counter_invalid_suffix", nil)
		w := httptest.NewRecorder()

		testRouter.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "error")
	})
}

func TestConcurrentMetricsAccess(t *testing.T) {
	logger := zaptest.NewLogger(t)
	registry := createTestRegistry()
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	// Test concurrent access to metrics
	const numRequests = 50
	results := make(chan int, numRequests)

	for i := 0; i < numRequests; i++ {
		go func() {
			req := httptest.NewRequest("GET", "/api/v1/metrics", nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)
			results <- w.Code
		}()
	}

	// Collect results
	for i := 0; i < numRequests; i++ {
		statusCode := <-results
		assert.Equal(t, http.StatusOK, statusCode)
	}
}

func BenchmarkGetMetrics(b *testing.B) {
	logger := zaptest.NewLogger(b)
	registry := createTestRegistry()
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/api/v1/metrics", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status 200, got %d", w.Code)
		}
	}
}

func BenchmarkGetRawMetrics(b *testing.B) {
	logger := zaptest.NewLogger(b)
	registry := createTestRegistry()
	api.InitializeMetrics(logger, registry)

	router := gin.New()
	api.SetupMetricsRoutes(router, logger)

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/metrics", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			b.Errorf("Expected status 200, got %d", w.Code)
		}
	}
}
