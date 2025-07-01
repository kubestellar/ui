package telemetry

import (
	"github.com/prometheus/client_golang/prometheus"
)

// These metrics track the lifecycle and status of WebSocket connections.

var (
	WebsocketConnectionsActive = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "websocket_connections_active",
			Help: "Number of active WebSocket connections",
		},
		[]string{"endpoint", "type"},
	)

	WebsocketConnectionUpgradedSuccess = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "websocket_connection_upgraded_success_total",
			Help: "Total number of successful WebSocket connection upgrades",
		},
		[]string{"endpoint", "type"},
	)

	WebsocketConnectionsFailed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "websocket_connections_failed_total",
			Help: "Total number of failed WebSocket connections",
		},
		[]string{"endpoint", "error_type"},
	)

	WebsocketConnectionUpgradedFailed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "websocket_connection_upgraded_failed_total",
			Help: "Total number of failed WebSocket connection upgrades",
		},
		[]string{"endpoint", "error_type"},
	)
)
