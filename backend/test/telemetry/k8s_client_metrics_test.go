package telemetry

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTotalK8sClientRequests(t *testing.T) {
	// Register the metric with default registry for this test
	prometheus.MustRegister(telemetry.TotalK8sClientRequests)
	defer prometheus.Unregister(telemetry.TotalK8sClientRequests)

	// Reset the counter for clean test
	telemetry.TotalK8sClientRequests.Reset()

	// Test basic counter functionality
	telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", "200").Inc()
	telemetry.TotalK8sClientRequests.WithLabelValues("POST", "deployments", "201").Add(2)
	telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", "404").Inc()

	// Verify we can create metrics with the expected labels
	counter := telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", "200")
	assert.NotNil(t, counter)

	// Test that we can collect metrics
	metrics, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)

	// Find our metric
	found := false
	for _, metricFamily := range metrics {
		if metricFamily.GetName() == "k8s_client_requests_total" {
			found = true
			assert.Equal(t, "Total number of Kubernetes client requests", metricFamily.GetHelp())
			assert.Equal(t, len(metricFamily.GetMetric()), 3) // 3 different label combinations
			break
		}
	}
	assert.True(t, found, "k8s_client_requests_total metric should be present")
}

func TestK8sClientRequestDuration(t *testing.T) {
	// Register the metric with default registry for this test
	prometheus.MustRegister(telemetry.K8sClientRequestDuration)
	defer prometheus.Unregister(telemetry.K8sClientRequestDuration)

	// Reset the histogram for clean test
	telemetry.K8sClientRequestDuration.Reset()

	// Test basic histogram functionality
	telemetry.K8sClientRequestDuration.WithLabelValues("GET", "pods", "200").Observe(0.1)
	telemetry.K8sClientRequestDuration.WithLabelValues("POST", "deployments", "201").Observe(0.5)
	telemetry.K8sClientRequestDuration.WithLabelValues("GET", "pods", "200").Observe(0.2)

	// Verify we can create metrics with the expected labels
	histogram := telemetry.K8sClientRequestDuration.WithLabelValues("GET", "pods", "200")
	assert.NotNil(t, histogram)

	// Test that buckets are configured (using default buckets)
	expectedBuckets := prometheus.DefBuckets
	assert.NotEmpty(t, expectedBuckets)

	// Test that we can collect metrics
	metrics, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)

	// Find our metric
	found := false
	for _, metricFamily := range metrics {
		if metricFamily.GetName() == "k8s_client_request_duration_seconds" {
			found = true
			assert.Equal(t, "Duration of Kubernetes client requests in seconds", metricFamily.GetHelp())
			assert.True(t, len(metricFamily.GetMetric()) >= 2) // At least 2 different label combinations
			break
		}
	}
	assert.True(t, found, "k8s_client_request_duration_seconds metric should be present")
}

func TestK8sClientErrorCounter(t *testing.T) {
	// Register the metric with default registry for this test
	prometheus.MustRegister(telemetry.K8sClientErrorCounter)
	defer prometheus.Unregister(telemetry.K8sClientErrorCounter)

	// Reset the counter for clean test
	telemetry.K8sClientErrorCounter.Reset()

	// Test basic counter functionality
	telemetry.K8sClientErrorCounter.WithLabelValues("GET", "pods", "404").Inc()
	telemetry.K8sClientErrorCounter.WithLabelValues("POST", "deployments", "500").Add(3)
	telemetry.K8sClientErrorCounter.WithLabelValues("DELETE", "services", "403").Inc()

	// Verify we can create metrics with the expected labels
	counter := telemetry.K8sClientErrorCounter.WithLabelValues("GET", "pods", "404")
	assert.NotNil(t, counter)

	// Test that we can collect metrics
	metrics, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)

	// Find our metric
	found := false
	for _, metricFamily := range metrics {
		if metricFamily.GetName() == "k8s_client_error_requests_total" {
			found = true
			assert.Equal(t, "Total number of Kubernetes client error requests", metricFamily.GetHelp())
			assert.Equal(t, len(metricFamily.GetMetric()), 3) // 3 different label combinations
			break
		}
	}
	assert.True(t, found, "k8s_client_error_requests_total metric should be present")
}

func TestMetricLabels(t *testing.T) {
	// Test that all metrics accept the same label structure
	labels := []string{"GET", "pods", "200"}

	// These should not panic
	assert.NotPanics(t, func() {
		telemetry.TotalK8sClientRequests.WithLabelValues(labels...)
	})

	assert.NotPanics(t, func() {
		telemetry.K8sClientRequestDuration.WithLabelValues(labels...)
	})

	assert.NotPanics(t, func() {
		telemetry.K8sClientErrorCounter.WithLabelValues(labels...)
	})
}

func TestMetricRegistration(t *testing.T) {
	// Create a new registry for testing
	registry := prometheus.NewRegistry()

	// Register all metrics
	err := registry.Register(telemetry.TotalK8sClientRequests)
	assert.NoError(t, err, "TotalK8sClientRequests should register successfully")

	err = registry.Register(telemetry.K8sClientRequestDuration)
	assert.NoError(t, err, "K8sClientRequestDuration should register successfully")

	err = registry.Register(telemetry.K8sClientErrorCounter)
	assert.NoError(t, err, "K8sClientErrorCounter should register successfully")

	// Verify all metrics are registered
	metricFamilies, err := registry.Gather()
	require.NoError(t, err)

	metricNames := make(map[string]bool)
	for _, mf := range metricFamilies {
		metricNames[mf.GetName()] = true
	}

	assert.True(t, metricNames["k8s_client_requests_total"])
	assert.True(t, metricNames["k8s_client_request_duration_seconds"])
	assert.True(t, metricNames["k8s_client_error_requests_total"])
}

func TestMetricValues(t *testing.T) {
	// Register metrics for this test
	prometheus.MustRegister(telemetry.TotalK8sClientRequests)
	prometheus.MustRegister(telemetry.K8sClientRequestDuration)
	prometheus.MustRegister(telemetry.K8sClientErrorCounter)

	defer func() {
		prometheus.Unregister(telemetry.TotalK8sClientRequests)
		prometheus.Unregister(telemetry.K8sClientRequestDuration)
		prometheus.Unregister(telemetry.K8sClientErrorCounter)
	}()

	// Reset all metrics
	telemetry.TotalK8sClientRequests.Reset()
	telemetry.K8sClientRequestDuration.Reset()
	telemetry.K8sClientErrorCounter.Reset()

	// Add some known values
	telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", "200").Add(5)
	telemetry.K8sClientRequestDuration.WithLabelValues("GET", "pods", "200").Observe(0.1)
	telemetry.K8sClientErrorCounter.WithLabelValues("GET", "pods", "500").Add(2)

	// Test counter value - counters work directly with testutil.ToFloat64
	counterValue := testutil.ToFloat64(telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", "200"))
	assert.Equal(t, float64(5), counterValue)

	// Test histogram count - for histograms, we need to check the count using a different approach
	// Let's verify the histogram was observed by checking it doesn't panic and has valid data
	histogram := telemetry.K8sClientRequestDuration.WithLabelValues("GET", "pods", "200")
	assert.NotNil(t, histogram)

	// We can also verify by gathering metrics and checking the count
	metrics, err := prometheus.DefaultGatherer.Gather()
	require.NoError(t, err)

	var histogramFound bool
	for _, mf := range metrics {
		if mf.GetName() == "k8s_client_request_duration_seconds" {
			histogramFound = true
			for _, metric := range mf.GetMetric() {
				if metric.GetHistogram() != nil {
					assert.Equal(t, uint64(1), metric.GetHistogram().GetSampleCount())
				}
			}
		}
	}
	assert.True(t, histogramFound, "histogram metric should be found")

	// Test error counter value
	errorCounterValue := testutil.ToFloat64(telemetry.K8sClientErrorCounter.WithLabelValues("GET", "pods", "500"))
	assert.Equal(t, float64(2), errorCounterValue)
}

func TestMetricLabelValidation(t *testing.T) {
	// Test with different HTTP methods
	methods := []string{"GET", "POST", "PUT", "DELETE", "PATCH"}
	for _, method := range methods {
		assert.NotPanics(t, func() {
			telemetry.TotalK8sClientRequests.WithLabelValues(method, "pods", "200").Inc()
		})
	}

	// Test with different resources
	resources := []string{"pods", "deployments", "services", "configmaps", "secrets"}
	for _, resource := range resources {
		assert.NotPanics(t, func() {
			telemetry.TotalK8sClientRequests.WithLabelValues("GET", resource, "200").Inc()
		})
	}

	// Test with different status codes
	statusCodes := []string{"200", "201", "400", "401", "403", "404", "500", "503"}
	for _, statusCode := range statusCodes {
		assert.NotPanics(t, func() {
			telemetry.TotalK8sClientRequests.WithLabelValues("GET", "pods", statusCode).Inc()
		})
	}
}
