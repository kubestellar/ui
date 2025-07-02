package telemetry

import (
	"github.com/prometheus/client_golang/prometheus"
)

// These metrics track the performance and traffic of the application's own HTTP server.

var (
	TotalHTTPRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status_code"},
	)

	HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path"},
	)

	HTTPErrorCounter = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_error_requests_total",
			Help: "Total number of HTTP error requests",
		},
		[]string{"method", "path", "status_code"},
	)
)
