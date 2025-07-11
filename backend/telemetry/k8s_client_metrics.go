package telemetry

import (
	"github.com/prometheus/client_golang/prometheus"
)

// These metrics track the application's performance as a client to the Kubernetes API server.

var (
	TotalK8sClientRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "k8s_client_requests_total",
			Help: "Total number of Kubernetes client requests",
		},
		[]string{"method", "resource", "status_code"},
	)

	K8sClientRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "k8s_client_request_duration_seconds",
			Help:    "Duration of Kubernetes client requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "resource", "status_code"},
	)

	K8sClientErrorCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "k8s_client_error_requests_total",
			Help: "Total number of Kubernetes client error requests",
		},
		[]string{"method", "resource", "status_code"},
	)
)
