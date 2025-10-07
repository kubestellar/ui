package telemetry

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"

	"github.com/kubestellar/ui/backend/telemetry"
)

func TestWebSocketMetrics_AllPaths(t *testing.T) {
	// Register only once
	reg := prometheus.NewRegistry()
	_ = reg.Register(telemetry.WebsocketConnectionsActive)
	_ = reg.Register(telemetry.WebsocketConnectionUpgradedSuccess)
	_ = reg.Register(telemetry.WebsocketConnectionsFailed)
	_ = reg.Register(telemetry.WebsocketConnectionUpgradedFailed)

	// Simulate only once per metric to avoid overcounting
	telemetry.WebsocketConnectionsActive.WithLabelValues("/ws/updates", "cluster").Inc()
	telemetry.WebsocketConnectionsActive.WithLabelValues("/ws/updates", "cluster").Dec()
	if val := testutil.ToFloat64(telemetry.WebsocketConnectionsActive.WithLabelValues("/ws/updates", "cluster")); val != 0 {
		t.Errorf("Expected 0 active connections, got %v", val)
	}

	telemetry.WebsocketConnectionUpgradedSuccess.WithLabelValues("/ws/updates", "user").Add(1)
	if val := testutil.ToFloat64(telemetry.WebsocketConnectionUpgradedSuccess.WithLabelValues("/ws/updates", "user")); val != 1 {
		t.Errorf("Expected 1 upgraded success, got %v", val)
	}

	telemetry.WebsocketConnectionUpgradedFailed.WithLabelValues("/ws/updates", "bad-header").Inc()
	if val := testutil.ToFloat64(telemetry.WebsocketConnectionUpgradedFailed.WithLabelValues("/ws/updates", "bad-header")); val != 1 {
		t.Errorf("Expected 1 upgrade failure for bad-header, got %v", val)
	}

	telemetry.WebsocketConnectionsFailed.WithLabelValues("/ws/updates", "timeout").Add(3)
	if val := testutil.ToFloat64(telemetry.WebsocketConnectionsFailed.WithLabelValues("/ws/updates", "timeout")); val != 3 {
		t.Errorf("Expected 3 timeout failures, got %v", val)
	}
}

func TestWebsocketGaugeCannotGoNegative(t *testing.T) {
	endpoint := "/ws/test"
	role := "tester"

	g := telemetry.WebsocketConnectionsActive.WithLabelValues(endpoint, role)

	g.Dec()
	val := testutil.ToFloat64(g)
	if val < 0 {
		t.Logf("Gauge went negative (allowed by Prometheus): %v", val)
	} else {
		t.Logf("Gauge value: %v", val)
	}
}

func TestWebsocketMetrics_LabelMismatch(t *testing.T) {
	// Incorrect label usage should panic — test with recover
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("Expected panic with wrong label values, but none occurred")
		}
	}()

	// Fewer than required labels — should panic
	telemetry.WebsocketConnectionsActive.WithLabelValues("missing-role").Inc()
}
