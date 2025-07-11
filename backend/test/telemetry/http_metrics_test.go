package telemetry_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestTotalHTTPRequestsCounter(t *testing.T) {
	metric := telemetry.TotalHTTPRequests
	metric.Reset()
	metric.WithLabelValues("GET", "/test", "200").Inc()
	metric.WithLabelValues("POST", "/test", "500").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("GET", "/test", "200")); got != 1 {
		t.Errorf("Expected GET /test 200 to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("POST", "/test", "500")); got != 2 {
		t.Errorf("Expected POST /test 500 to be 2, got %v", got)
	}
}

func TestHTTPRequestDurationHistogram(t *testing.T) {
	metric := telemetry.HTTPRequestDuration
	metric.Reset()
	metric.WithLabelValues("GET", "/test").Observe(0.5)
	metric.WithLabelValues("GET", "/test").Observe(1.5)

	count := testutil.CollectAndCount(metric)
	if count == 0 {
		t.Error("Expected histogram to have observations")
	}
}

func TestHTTPErrorCounter(t *testing.T) {
	metric := telemetry.HTTPErrorCounter
	metric.Reset()
	metric.WithLabelValues("GET", "/fail", "500").Inc()
	metric.WithLabelValues("POST", "/fail", "400").Add(3)

	if got := testutil.ToFloat64(metric.WithLabelValues("GET", "/fail", "500")); got != 1 {
		t.Errorf("Expected GET /fail 500 to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("POST", "/fail", "400")); got != 3 {
		t.Errorf("Expected POST /fail 400 to be 3, got %v", got)
	}
}

func TestHTTPMetricsLabelCardinality(t *testing.T) {
	metric := telemetry.TotalHTTPRequests
	metric.Reset()
	metric.WithLabelValues("GET", "/foo", "200").Inc()
	metric.WithLabelValues("POST", "/bar", "404").Inc()
	metric.WithLabelValues("PUT", "/baz", "500").Inc()

	collected := testutil.CollectAndCount(metric)
	if collected != 3 {
		t.Errorf("Expected 3 label combinations, got %d", collected)
	}
}
