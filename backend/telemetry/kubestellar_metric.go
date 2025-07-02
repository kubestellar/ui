package telemetry

import (
	"github.com/prometheus/client_golang/prometheus"
)

// These metrics track the performance and behavior of the core KubeStellar application logic.

var (
	// Counter metrics for binding policy operations
	BindingPolicyOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "kubestellar_binding_policy_operations_total",
			Help: "Total number of binding policy operations",
		},
		[]string{"operation", "status"},
	)

	// Histogram for binding policy operation latency
	BindingPolicyOperationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "kubestellar_binding_policy_operation_duration_seconds",
			Help:    "Duration of binding policy operations",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"operation"},
	)

	// Cache hit/miss ratios for binding policies
	BindingPolicyCacheHits = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "kubestellar_binding_policy_cache_hits_total",
			Help: "Total cache hits for binding policies",
		},
		[]string{"cache_type"},
	)

	BindingPolicyCacheMisses = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "kubestellar_binding_policy_cache_misses_total",
			Help: "Total cache misses for binding policies",
		},
		[]string{"cache_type"},
	)

	// Watch events related to binding policies
	BindingPolicyWatchEvents = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "kubestellar_binding_policy_watch_events_total",
			Help: "Total watch events processed",
		},
		[]string{"event_type", "status"},
	)

	// Reconciliation time tracking for binding policies
	BindingPolicyReconciliationDuration = prometheus.NewHistogram(
		prometheus.HistogramOpts{
			Name:    "kubestellar_binding_policy_reconciliation_duration_seconds",
			Help:    "Time taken for binding policy reconciliation",
			Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0},
		},
	)

	// Metrics for the cluster onboarding feature
	ClusterOnboardingDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "cluster_onboarding_duration_seconds",
			Help:    "Duration of cluster onboarding process",
			Buckets: []float64{30, 60, 120, 300, 600, 900, 1800}, // 30s to 30min
		},
		[]string{"cluster_name", "status"},
	)
)
