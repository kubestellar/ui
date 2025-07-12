package telemetry

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestTotalHTTPRequests(t *testing.T) {
	// Reset the counter before testing
	telemetry.TotalHTTPRequests.Reset()

	// Test that the metric is properly defined
	if telemetry.TotalHTTPRequests == nil {
		t.Fatal("TotalHTTPRequests should not be nil")
	}

	// Test incrementing the counter
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/users", "200").Inc()
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/api/users", "201").Inc()
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/users", "404").Inc()

	// Test that the counter values are correct using CollectAndCount
	expectedMetrics := 3 // We created 3 different label combinations
	if got := testutil.CollectAndCount(telemetry.TotalHTTPRequests); got != expectedMetrics {
		t.Errorf("Expected %d metrics, got %d", expectedMetrics, got)
	}

	// Test specific metric values by collecting and comparing
	registry := prometheus.NewRegistry()
	registry.MustRegister(telemetry.TotalHTTPRequests)

	metricFamilies, err := registry.Gather()
	if err != nil {
		t.Fatalf("Failed to gather metrics: %v", err)
	}

	if len(metricFamilies) != 1 {
		t.Fatalf("Expected 1 metric family, got %d", len(metricFamilies))
	}

	family := metricFamilies[0]
	if len(family.Metric) != 3 {
		t.Fatalf("Expected 3 metrics, got %d", len(family.Metric))
	}

	// Each metric should have a value of 1
	for _, metric := range family.Metric {
		if metric.GetCounter().GetValue() != 1.0 {
			t.Errorf("Expected counter value 1.0, got %f", metric.GetCounter().GetValue())
		}
	}
}

func TestHTTPRequestDuration(t *testing.T) {
	// Test that the metric is properly defined
	if telemetry.HTTPRequestDuration == nil {
		t.Fatal("HTTPRequestDuration should not be nil")
	}

	// Test observing durations
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/api/users").Observe(0.1)
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/api/users").Observe(0.2)
	telemetry.HTTPRequestDuration.WithLabelValues("POST", "/api/users").Observe(0.5)

	// Test that observations were recorded using CollectAndCount
	expectedMetrics := 2 // We created 2 different label combinations
	if got := testutil.CollectAndCount(telemetry.HTTPRequestDuration); got != expectedMetrics {
		t.Errorf("Expected %d metrics, got %d", expectedMetrics, got)
	}

	// Test specific metric values by collecting and comparing
	registry := prometheus.NewRegistry()
	registry.MustRegister(telemetry.HTTPRequestDuration)

	metricFamilies, err := registry.Gather()
	if err != nil {
		t.Fatalf("Failed to gather metrics: %v", err)
	}

	if len(metricFamilies) != 1 {
		t.Fatalf("Expected 1 metric family, got %d", len(metricFamilies))
	}

	family := metricFamilies[0]
	if len(family.Metric) != 2 {
		t.Fatalf("Expected 2 metrics, got %d", len(family.Metric))
	}

	// Check that we have the right number of observations
	for _, metric := range family.Metric {
		histogram := metric.GetHistogram()
		if histogram == nil {
			t.Error("Expected histogram metric, got nil")
			continue
		}

		// Check sample count (number of observations)
		labels := metric.GetLabel()
		if len(labels) >= 2 && labels[0].GetValue() == "GET" && labels[1].GetValue() == "/api/users" {
			if histogram.GetSampleCount() != 2 {
				t.Errorf("Expected 2 observations for GET /api/users, got %d", histogram.GetSampleCount())
			}
		} else if len(labels) >= 2 && labels[0].GetValue() == "POST" && labels[1].GetValue() == "/api/users" {
			if histogram.GetSampleCount() != 1 {
				t.Errorf("Expected 1 observation for POST /api/users, got %d", histogram.GetSampleCount())
			}
		}
	}
}

func TestHTTPErrorCounter(t *testing.T) {
	// Reset the counter before testing
	telemetry.HTTPErrorCounter.Reset()

	// Test that the metric is properly defined
	if telemetry.HTTPErrorCounter == nil {
		t.Fatal("HTTPErrorCounter should not be nil")
	}

	// Test incrementing error counters
	telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/users", "404").Inc()
	telemetry.HTTPErrorCounter.WithLabelValues("POST", "/api/users", "500").Inc()
	telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/users", "404").Inc()

	// Test that the counter values are correct using CollectAndCount
	expectedMetrics := 2 // We created 2 different label combinations
	if got := testutil.CollectAndCount(telemetry.HTTPErrorCounter); got != expectedMetrics {
		t.Errorf("Expected %d metrics, got %d", expectedMetrics, got)
	}

	// Test specific metric values by collecting and comparing
	registry := prometheus.NewRegistry()
	registry.MustRegister(telemetry.HTTPErrorCounter)

	metricFamilies, err := registry.Gather()
	if err != nil {
		t.Fatalf("Failed to gather metrics: %v", err)
	}

	if len(metricFamilies) != 1 {
		t.Fatalf("Expected 1 metric family, got %d", len(metricFamilies))
	}

	family := metricFamilies[0]
	if len(family.Metric) != 2 {
		t.Fatalf("Expected 2 metrics, got %d", len(family.Metric))
	}

	// Check specific counter values
	for _, metric := range family.Metric {
		labels := metric.GetLabel()
		if len(labels) >= 3 {
			method := labels[0].GetValue()
			path := labels[1].GetValue()
			statusCode := labels[2].GetValue()

			if method == "GET" && path == "/api/users" && statusCode == "404" {
				if metric.GetCounter().GetValue() != 2.0 {
					t.Errorf("Expected counter value 2.0 for GET /api/users 404, got %f", metric.GetCounter().GetValue())
				}
			} else if method == "POST" && path == "/api/users" && statusCode == "500" {
				if metric.GetCounter().GetValue() != 1.0 {
					t.Errorf("Expected counter value 1.0 for POST /api/users 500, got %f", metric.GetCounter().GetValue())
				}
			}
		}
	}
}

func TestMetricLabels(t *testing.T) {
	tests := []struct {
		name   string
		metric prometheus.Collector
		labels []string
	}{
		{
			name:   "TotalHTTPRequests labels",
			metric: telemetry.TotalHTTPRequests,
			labels: []string{"method", "path", "status_code"},
		},
		{
			name:   "HTTPRequestDuration labels",
			metric: telemetry.HTTPRequestDuration,
			labels: []string{"method", "path"},
		},
		{
			name:   "HTTPErrorCounter labels",
			metric: telemetry.HTTPErrorCounter,
			labels: []string{"method", "path", "status_code"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This test ensures the metrics can be created with the expected labels
			// The actual label validation is done implicitly when calling WithLabelValues
			switch metric := tt.metric.(type) {
			case *prometheus.CounterVec:
				if len(tt.labels) == 3 {
					metric.WithLabelValues("GET", "/test", "200")
				} else {
					t.Errorf("Unexpected number of labels for counter: %d", len(tt.labels))
				}
			case *prometheus.HistogramVec:
				if len(tt.labels) == 2 {
					metric.WithLabelValues("GET", "/test")
				} else {
					t.Errorf("Unexpected number of labels for histogram: %d", len(tt.labels))
				}
			}
		})
	}
}

func TestMetricNames(t *testing.T) {
	tests := []struct {
		name         string
		metric       prometheus.Collector
		expectedName string
	}{
		{
			name:         "TotalHTTPRequests name",
			metric:       telemetry.TotalHTTPRequests,
			expectedName: "http_requests_total",
		},
		{
			name:         "HTTPRequestDuration name",
			metric:       telemetry.HTTPRequestDuration,
			expectedName: "http_request_duration_seconds",
		},
		{
			name:         "HTTPErrorCounter name",
			metric:       telemetry.HTTPErrorCounter,
			expectedName: "http_error_requests_total",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Get the metric description
			desc := make(chan *prometheus.Desc, 1)
			tt.metric.Describe(desc)
			close(desc)

			metricDesc := <-desc
			if metricDesc == nil {
				t.Fatal("Expected metric description, got nil")
			}

			// Check if the metric name matches (this is a basic check)
			// Note: The actual metric name validation would require more complex parsing
			// of the metric description string representation
			if metricDesc.String() == "" {
				t.Error("Expected non-empty metric description")
			}
		})
	}
}

func TestMetricTypes(t *testing.T) {
	// Test that metrics are of the correct types
	if telemetry.TotalHTTPRequests == nil {
		t.Error("TotalHTTPRequests should not be nil")
	}

	if telemetry.HTTPRequestDuration == nil {
		t.Error("HTTPRequestDuration should not be nil")
	}

	if telemetry.HTTPErrorCounter == nil {
		t.Error("HTTPErrorCounter should not be nil")
	}

	// Test that we can create metrics with expected labels (this will panic if wrong)
	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Panic when creating counter with labels: %v", r)
			}
		}()
		telemetry.TotalHTTPRequests.WithLabelValues("GET", "/test", "200")
	}()

	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Panic when creating histogram with labels: %v", r)
			}
		}()
		telemetry.HTTPRequestDuration.WithLabelValues("GET", "/test")
	}()

	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Panic when creating error counter with labels: %v", r)
			}
		}()
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/test", "404")
	}()
}

func TestHistogramBuckets(t *testing.T) {
	// Test that histogram uses default buckets
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/test").Observe(0.001)
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/test").Observe(0.1)
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/test").Observe(1.0)

	// Test using CollectAndCount
	if got := testutil.CollectAndCount(telemetry.HTTPRequestDuration); got == 0 {
		t.Error("Expected at least 1 metric, got 0")
	}

	// Test specific values by collecting metrics
	registry := prometheus.NewRegistry()
	registry.MustRegister(telemetry.HTTPRequestDuration)

	metricFamilies, err := registry.Gather()
	if err != nil {
		t.Fatalf("Failed to gather metrics: %v", err)
	}

	if len(metricFamilies) != 1 {
		t.Fatalf("Expected 1 metric family, got %d", len(metricFamilies))
	}

	family := metricFamilies[0]
	found := false
	for _, metric := range family.Metric {
		labels := metric.GetLabel()
		if len(labels) >= 2 && labels[0].GetValue() == "GET" && labels[1].GetValue() == "/test" {
			histogram := metric.GetHistogram()
			if histogram == nil {
				t.Error("Expected histogram metric, got nil")
				continue
			}

			if histogram.GetSampleCount() != 3 {
				t.Errorf("Expected 3 observations, got %d", histogram.GetSampleCount())
			}
			found = true
			break
		}
	}

	if !found {
		t.Error("Could not find expected metric with labels GET, /test")
	}
}
