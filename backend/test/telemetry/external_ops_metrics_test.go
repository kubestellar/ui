package telemetry_test

import (
	"os/exec"
	"runtime"
	"testing"

	"github.com/kubestellar/ui/backend/telemetry"
	"github.com/prometheus/client_golang/prometheus/testutil"
)

func newCmdSuccess() *exec.Cmd {
	if runtime.GOOS == "windows" {
		return exec.Command("cmd", "/C", "echo", "hello")
	}
	return exec.Command("echo", "hello")
}

func newCmdFail() *exec.Cmd {
	if runtime.GOOS == "windows" {
		return exec.Command("cmd", "/C", "exit", "1")
	}
	return exec.Command("false")
}

func TestInstrumentKubectlCommand_Success(t *testing.T) {
	cmd := newCmdSuccess()
	err := telemetry.InstrumentKubectlCommand(cmd, "get-pods", "test-context")
	if err != nil {
		t.Fatalf("Expected success, got error: %v", err)
	}
	val := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("get-pods", "test-context", "success"))
	if val != 1 {
		t.Errorf("Expected 1 success metric, got %v", val)
	}
}

func TestInstrumentKubectlCommand_Failure(t *testing.T) {
	cmd := newCmdFail()
	err := telemetry.InstrumentKubectlCommand(cmd, "delete-pods", "prod-context")
	if err == nil {
		t.Fatalf("Expected error from command, got nil")
	}
	val := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("delete-pods", "prod-context", "failed"))
	if val != 1 {
		t.Errorf("Expected 1 failed metric, got %v", val)
	}
}

func TestInstrumentKubectlCommand_MultipleCalls(t *testing.T) {
	for i := 0; i < 3; i++ {
		_ = telemetry.InstrumentKubectlCommand(newCmdSuccess(), "apply", "multi")
	}
	val := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("apply", "multi", "success"))
	if val != 3 {
		t.Errorf("Expected 3 success metrics, got %v", val)
	}
}

func TestInstrumentKubectlCommand_UnknownCommand(t *testing.T) {
	cmd := exec.Command("nonexistent-command")
	err := telemetry.InstrumentKubectlCommand(cmd, "invalid", "dev")
	if err == nil {
		t.Fatalf("Expected error from unknown command, got nil")
	}
	val := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("invalid", "dev", "failed"))
	if val != 1 {
		t.Errorf("Expected 1 failed metric for unknown command, got %v", val)
	}
}

func TestGithubDeploymentsTotal(t *testing.T) {
	telemetry.GithubDeploymentsTotal.WithLabelValues("auto", "success").Add(2)
	val := testutil.ToFloat64(telemetry.GithubDeploymentsTotal.WithLabelValues("auto", "success"))
	if val != 2 {
		t.Errorf("Expected 2 GitHub deployments, got %v", val)
	}
}

func TestGithubDeploymentsMultipleStatusTypes(t *testing.T) {
	telemetry.GithubDeploymentsTotal.WithLabelValues("manual", "failed").Inc()
	telemetry.GithubDeploymentsTotal.WithLabelValues("auto", "in-progress").Inc()

	if got := testutil.ToFloat64(telemetry.GithubDeploymentsTotal.WithLabelValues("manual", "failed")); got != 1 {
		t.Errorf("Expected 1 failed manual deployment, got %v", got)
	}
	if got := testutil.ToFloat64(telemetry.GithubDeploymentsTotal.WithLabelValues("auto", "in-progress")); got != 1 {
		t.Errorf("Expected 1 in-progress auto deployment, got %v", got)
	}
}

func TestKubectlOperationsTotal_LabelEdgeCases(t *testing.T) {
	telemetry.KubectlOperationsTotal.WithLabelValues("", "", "success").Inc()
	telemetry.KubectlOperationsTotal.WithLabelValues("very-long-command-name-that-should-still-work", "long-context", "success").Inc()

	if got := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("", "", "success")); got != 1 {
		t.Errorf("Expected 1 metric for empty labels, got %v", got)
	}
	if got := testutil.ToFloat64(telemetry.KubectlOperationsTotal.WithLabelValues("very-long-command-name-that-should-still-work", "long-context", "success")); got != 1 {
		t.Errorf("Expected 1 metric for long labels, got %v", got)
	}
}
