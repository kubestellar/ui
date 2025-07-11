package telemetry_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestTotalK8sClientRequestsCounter(t *testing.T) {
	metric := telemetry.TotalK8sClientRequests
	metric.Reset()
	metric.WithLabelValues("GET", "pods", "200").Inc()
	metric.WithLabelValues("POST", "deployments", "500").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("GET", "pods", "200")); got != 1 {
		t.Errorf("Expected GET/pods/200 to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("POST", "deployments", "500")); got != 2 {
		t.Errorf("Expected POST/deployments/500 to be 2, got %v", got)
	}
}

func TestK8sClientRequestDurationHistogram(t *testing.T) {
	metric := telemetry.K8sClientRequestDuration
	metric.Reset()
	metric.WithLabelValues("GET", "pods", "200").Observe(0.5)
	metric.WithLabelValues("GET", "pods", "200").Observe(1.5)
	metric.WithLabelValues("POST", "deployments", "500").Observe(2.0)

	count := testutil.CollectAndCount(metric)
	if count == 0 {
		t.Error("Expected histogram to have observations")
	}
}

func TestK8sClientErrorCounter(t *testing.T) {
	metric := telemetry.K8sClientErrorCounter
	metric.Reset()
	metric.WithLabelValues("GET", "pods", "500").Inc()
	metric.WithLabelValues("POST", "deployments", "400").Add(3)

	if got := testutil.ToFloat64(metric.WithLabelValues("GET", "pods", "500")); got != 1 {
		t.Errorf("Expected GET/pods/500 to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("POST", "deployments", "400")); got != 3 {
		t.Errorf("Expected POST/deployments/400 to be 3, got %v", got)
	}
}

func TestK8sClientMetricsLabelCardinality(t *testing.T) {
	metric := telemetry.TotalK8sClientRequests
	metric.Reset()
	metric.WithLabelValues("GET", "foo", "200").Inc()
	metric.WithLabelValues("POST", "bar", "404").Inc()
	metric.WithLabelValues("PUT", "baz", "500").Inc()

	collected := testutil.CollectAndCount(metric)
	if collected != 3 {
		t.Errorf("Expected 3 label combinations, got %d", collected)
	}
}
