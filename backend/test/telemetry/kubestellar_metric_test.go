package telemetry_test

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"

	"github.com/kubestellar/ui/backend/telemetry"
)

func TestTelemetryMetrics(t *testing.T) {
	registry := prometheus.NewRegistry()

	// Register all metrics
	for _, collector := range []prometheus.Collector{
		telemetry.BindingPolicyOperationsTotal,
		telemetry.BindingPolicyOperationDuration,
		telemetry.BindingPolicyCacheHits,
		telemetry.BindingPolicyCacheMisses,
		telemetry.BindingPolicyWatchEvents,
		telemetry.BindingPolicyReconciliationDuration,
		telemetry.ClusterOnboardingDuration,
	} {
		if err := registry.Register(collector); err != nil {
			t.Fatalf("Failed to register collector: %v", err)
		}
	}

	// COUNTER: BindingPolicyOperationsTotal
	telemetry.BindingPolicyOperationsTotal.WithLabelValues("create", "success").Inc()
	telemetry.BindingPolicyOperationsTotal.WithLabelValues("delete", "error").Add(3)
	if got := testutil.ToFloat64(telemetry.BindingPolicyOperationsTotal.WithLabelValues("create", "success")); got != 1 {
		t.Errorf("Expected 1 create success op, got %v", got)
	}
	if got := testutil.ToFloat64(telemetry.BindingPolicyOperationsTotal.WithLabelValues("delete", "error")); got != 3 {
		t.Errorf("Expected 3 delete error ops, got %v", got)
	}

	// HISTOGRAM: BindingPolicyOperationDuration
	telemetry.BindingPolicyOperationDuration.WithLabelValues("create").Observe(1.2)
	telemetry.BindingPolicyOperationDuration.WithLabelValues("create").Observe(0.8)
	telemetry.BindingPolicyOperationDuration.WithLabelValues("delete").Observe(2.5)

	// COUNTER: BindingPolicyCacheHits/Misses
	telemetry.BindingPolicyCacheHits.WithLabelValues("policy_cache").Add(5)
	telemetry.BindingPolicyCacheMisses.WithLabelValues("policy_cache").Add(2)
	if got := testutil.ToFloat64(telemetry.BindingPolicyCacheHits.WithLabelValues("policy_cache")); got != 5 {
		t.Errorf("Expected 5 cache hits, got %v", got)
	}
	if got := testutil.ToFloat64(telemetry.BindingPolicyCacheMisses.WithLabelValues("policy_cache")); got != 2 {
		t.Errorf("Expected 2 cache misses, got %v", got)
	}

	// COUNTER: BindingPolicyWatchEvents
	telemetry.BindingPolicyWatchEvents.WithLabelValues("add", "processed").Inc()
	telemetry.BindingPolicyWatchEvents.WithLabelValues("delete", "failed").Add(2)
	if got := testutil.ToFloat64(telemetry.BindingPolicyWatchEvents.WithLabelValues("add", "processed")); got != 1 {
		t.Errorf("Expected 1 add processed event, got %v", got)
	}
	if got := testutil.ToFloat64(telemetry.BindingPolicyWatchEvents.WithLabelValues("delete", "failed")); got != 2 {
		t.Errorf("Expected 2 delete failed events, got %v", got)
	}

	// HISTOGRAM: BindingPolicyReconciliationDuration
	telemetry.BindingPolicyReconciliationDuration.Observe(0.4)
	telemetry.BindingPolicyReconciliationDuration.Observe(2.0)

	// HISTOGRAM: ClusterOnboardingDuration
	telemetry.ClusterOnboardingDuration.WithLabelValues("cluster-a", "success").Observe(90)
	telemetry.ClusterOnboardingDuration.WithLabelValues("cluster-b", "failed").Observe(600)
}
