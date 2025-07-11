package telemetry_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestBindingPolicyOperationsTotal(t *testing.T) {
	metric := telemetry.BindingPolicyOperationsTotal
	metric.Reset()
	metric.WithLabelValues("create", "success").Inc()
	metric.WithLabelValues("update", "failed").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("create", "success")); got != 1 {
		t.Errorf("Expected create/success to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("update", "failed")); got != 2 {
		t.Errorf("Expected update/failed to be 2, got %v", got)
	}
}

func TestBindingPolicyOperationDuration(t *testing.T) {
	metric := telemetry.BindingPolicyOperationDuration
	metric.Reset()
	metric.WithLabelValues("create").Observe(0.2)
	metric.WithLabelValues("create").Observe(0.8)
	metric.WithLabelValues("update").Observe(1.5)

	count := testutil.CollectAndCount(metric)
	if count == 0 {
		t.Error("Expected histogram to have observations")
	}
}

func TestBindingPolicyCacheHitsMisses(t *testing.T) {
	hits := telemetry.BindingPolicyCacheHits
	misses := telemetry.BindingPolicyCacheMisses
	hits.Reset()
	misses.Reset()

	hits.WithLabelValues("local").Inc()
	hits.WithLabelValues("remote").Add(2)
	misses.WithLabelValues("local").Inc()

	if got := testutil.ToFloat64(hits.WithLabelValues("local")); got != 1 {
		t.Errorf("Expected local cache hits to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(hits.WithLabelValues("remote")); got != 2 {
		t.Errorf("Expected remote cache hits to be 2, got %v", got)
	}
	if got := testutil.ToFloat64(misses.WithLabelValues("local")); got != 1 {
		t.Errorf("Expected local cache misses to be 1, got %v", got)
	}
}

func TestBindingPolicyWatchEvents(t *testing.T) {
	metric := telemetry.BindingPolicyWatchEvents
	metric.Reset()
	metric.WithLabelValues("add", "success").Inc()
	metric.WithLabelValues("delete", "failed").Add(3)

	if got := testutil.ToFloat64(metric.WithLabelValues("add", "success")); got != 1 {
		t.Errorf("Expected add/success to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("delete", "failed")); got != 3 {
		t.Errorf("Expected delete/failed to be 3, got %v", got)
	}
}

func TestBindingPolicyReconciliationDuration(t *testing.T) {
	metric := telemetry.BindingPolicyReconciliationDuration
	// NOTE: prometheus.Histogram does not support Reset().
	// This test may be affected by prior state if run in a suite.
	metric.Observe(0.5)
	metric.Observe(2.0)

	count := testutil.CollectAndCount(metric)
	if count == 0 {
		t.Error("Expected reconciliation histogram to have observations")
	}
}

func TestClusterOnboardingDuration(t *testing.T) {
	metric := telemetry.ClusterOnboardingDuration
	metric.Reset()
	metric.WithLabelValues("cluster1", "success").Observe(60)
	metric.WithLabelValues("cluster2", "failed").Observe(120)

	if got := testutil.CollectAndCount(metric); got != 2 {
		t.Errorf("Expected 2 label combinations, got %d", got)
	}
}
