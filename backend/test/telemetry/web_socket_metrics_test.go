package telemetry_test

import (
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestWebsocketConnectionsActiveGauge(t *testing.T) {
	metric := telemetry.WebsocketConnectionsActive
	metric.Reset()
	metric.WithLabelValues("/ws", "onboarding").Set(3)
	metric.WithLabelValues("/ws", "logs").Set(1)

	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "onboarding")); got != 3 {
		t.Errorf("Expected /ws/onboarding to be 3, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "logs")); got != 1 {
		t.Errorf("Expected /ws/logs to be 1, got %v", got)
	}
}

func TestWebsocketConnectionUpgradedSuccessCounter(t *testing.T) {
	metric := telemetry.WebsocketConnectionUpgradedSuccess
	metric.Reset()
	metric.WithLabelValues("/ws", "onboarding").Inc()
	metric.WithLabelValues("/ws", "logs").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "onboarding")); got != 1 {
		t.Errorf("Expected /ws/onboarding to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "logs")); got != 2 {
		t.Errorf("Expected /ws/logs to be 2, got %v", got)
	}
}

func TestWebsocketConnectionsFailedCounter(t *testing.T) {
	metric := telemetry.WebsocketConnectionsFailed
	metric.Reset()
	metric.WithLabelValues("/ws", "timeout").Inc()
	metric.WithLabelValues("/ws", "upgrade_error").Add(3)

	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "timeout")); got != 1 {
		t.Errorf("Expected /ws/timeout to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "upgrade_error")); got != 3 {
		t.Errorf("Expected /ws/upgrade_error to be 3, got %v", got)
	}
}

func TestWebsocketConnectionUpgradedFailedCounter(t *testing.T) {
	metric := telemetry.WebsocketConnectionUpgradedFailed
	metric.Reset()
	metric.WithLabelValues("/ws", "timeout").Inc()
	metric.WithLabelValues("/ws", "upgrade_error").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "timeout")); got != 1 {
		t.Errorf("Expected /ws/timeout to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("/ws", "upgrade_error")); got != 2 {
		t.Errorf("Expected /ws/upgrade_error to be 2, got %v", got)
	}
}
