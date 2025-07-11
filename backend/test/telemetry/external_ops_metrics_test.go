package telemetry_test

import (
	"os/exec"
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestInstrumentKubectlCommand_Success(t *testing.T) {
	metric := telemetry.KubectlOperationsTotal
	metric.Reset()

	cmd := exec.Command("echo", "hello")
	err := telemetry.InstrumentKubectlCommand(cmd, "apply", "test-context")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("apply", "test-context", "success")); got != 1 {
		t.Errorf("Expected success metric to be 1, got %v", got)
	}
}

func TestInstrumentKubectlCommand_Failure(t *testing.T) {
	metric := telemetry.KubectlOperationsTotal
	metric.Reset()

	cmd := exec.Command("false") // 'false' always exits with non-zero
	err := telemetry.InstrumentKubectlCommand(cmd, "delete", "fail-context")
	if err == nil {
		t.Error("Expected error, got nil")
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("delete", "fail-context", "failed")); got != 1 {
		t.Errorf("Expected failed metric to be 1, got %v", got)
	}
}

func TestGithubDeploymentsTotal(t *testing.T) {
	metric := telemetry.GithubDeploymentsTotal
	metric.Reset()
	metric.WithLabelValues("manual", "success").Inc()
	metric.WithLabelValues("webhook", "failed").Add(2)

	if got := testutil.ToFloat64(metric.WithLabelValues("manual", "success")); got != 1 {
		t.Errorf("Expected manual/success to be 1, got %v", got)
	}
	if got := testutil.ToFloat64(metric.WithLabelValues("webhook", "failed")); got != 2 {
		t.Errorf("Expected webhook/failed to be 2, got %v", got)
	}
}

// InstrumentKubectlCommand expects *exec.Cmd, so we need to adapt our fakeCmd for the test.
// We'll use a build tag or interface trick for more advanced cases, but for now, this suffices for coverage.
