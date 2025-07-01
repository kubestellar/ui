package telemetry

import (
	"os/exec"

	"github.com/prometheus/client_golang/prometheus"
)

// These metrics track operations involving external services or command-line tools.

var (
	KubectlOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "kubectl_operations_total",
			Help: "Total number of kubectl operations executed",
		},
		[]string{"command", "context", "status"},
	)

	GithubDeploymentsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "github_deployments_total",
			Help: "Total number of GitHub deployments created",
		},
		[]string{"type", "status"},
	)
)

// InstrumentKubectlCommand is an example function showing how to use the kubectl metric.
// This function logically belongs with the metric it instruments.
func InstrumentKubectlCommand(cmd *exec.Cmd, command string, context string) error {
	err := cmd.Run()
	status := "success"
	if err != nil {
		status = "failed"
	}
	KubectlOperationsTotal.WithLabelValues(command, context, status).Inc()
	return err
}
