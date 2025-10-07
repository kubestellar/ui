package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/k8s"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
)

// MetricsConfig holds configuration for metrics API
type MetricsConfig struct {
	Registry     prometheus.Gatherer
	Logger       *zap.Logger
	EnableFilter bool
	DefaultHost  string
	DefaultPort  string
}

var (
	defaultConfig *MetricsConfig
)

// InitializeMetrics initializes the metrics API with configuration
func InitializeMetrics(logger *zap.Logger, registry prometheus.Gatherer) {
	if registry == nil {
		registry = prometheus.DefaultGatherer
	}

	defaultConfig = &MetricsConfig{
		Registry:     registry,
		Logger:       logger,
		EnableFilter: getBoolEnv("ENABLE_METRICS_FILTER", true),
		DefaultHost:  getEnv("METRICS_HOST", "localhost"),
		DefaultPort:  getEnv("METRICS_PORT", getEnv("PORT", "4000")),
	}
}

// GetRawMetrics returns raw Prometheus metrics in text format
func GetRawMetrics(c *gin.Context) {
	// Use the standard Prometheus handler for raw metrics
	promhttp.HandlerFor(
		getRegistry(),
		promhttp.HandlerOpts{
			EnableOpenMetrics: true,
		},
	).ServeHTTP(c.Writer, c.Request)
}

// Helper functions
func getRegistry() prometheus.Gatherer {
	if defaultConfig != nil && defaultConfig.Registry != nil {
		return defaultConfig.Registry
	}
	return prometheus.DefaultGatherer
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return strings.ToLower(value) == "true"
	}
	return defaultValue
}

// SetupMetricsRoutes sets up metrics routes with proper endpoints
func SetupMetricsRoutes(router *gin.Engine, logger *zap.Logger) {
	// Initialize metrics configuration
	InitializeMetrics(logger, nil)

	// Raw Prometheus metrics endpoint (for Prometheus scraping)
	router.GET("/metrics", GetRawMetrics)

	// API v1 metrics endpoint for Prometheus compatibility
	v1 := router.Group("/api/v1")
	{
		v1.GET("/metrics", GetRawMetrics)
	}
}

// GetPodHealthMetrics returns the percentage of healthy pods across all clusters/contexts
var (
	podHealthCache      *gin.H
	podHealthCacheLock  sync.RWMutex
	podHealthLastUpdate time.Time
	podHealthExpiration = 60 * time.Second // Cache valid for 60 seconds
)

func GetPodHealthMetrics(c *gin.Context) {
	// Check if we have a valid cache
	podHealthCacheLock.RLock()
	cacheValid := podHealthCache != nil && time.Since(podHealthLastUpdate) < podHealthExpiration
	podHealthCacheLock.RUnlock()

	if cacheValid {
		fmt.Println("Returning cached pod health metrics")
		c.JSON(http.StatusOK, podHealthCache)
		return
	}

	// Cache is invalid or expired, fetch fresh metrics
	podHealthCacheLock.Lock()
	defer podHealthCacheLock.Unlock()

	// Double-check if another request refreshed the cache while we were waiting
	if podHealthCache != nil && time.Since(podHealthLastUpdate) < podHealthExpiration {
		fmt.Println("Another request refreshed the cache, using it")
		c.JSON(http.StatusOK, podHealthCache)
		return
	}

	// Get context from query parameter or use default
	contextName := c.Query("context")
	if contextName == "" {
		// Use current context from kubeconfig
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			home := os.Getenv("HOME")
			if home == "" {
				home = os.Getenv("USERPROFILE") // Windows
			}
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}

		config, err := clientcmd.LoadFromFile(kubeconfig)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kubeconfig", "details": err.Error()})
			return
		}
		contextName = config.CurrentContext
	}

	fmt.Printf("GetPodHealthMetrics handler called for context: %s\n", contextName)

	// Get client for specific context
	clientset, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get client for context", "details": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// List namespaces
	nsList, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list namespaces", "details": err.Error()})
		return
	}

	totalPods := 0
	healthyPods := 0

	// Check pods in each namespace
	for _, ns := range nsList.Items {
		podList, err := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{})
		if err != nil {
			fmt.Printf("Error listing pods in namespace %s: %v\n", ns.Name, err)
			continue
		}

		for _, pod := range podList.Items {
			totalPods++
			if pod.Status.Phase == "Running" {
				allReady := true
				for _, cs := range pod.Status.ContainerStatuses {
					if !cs.Ready {
						allReady = false
						break
					}
				}
				if allReady {
					healthyPods++
				}
			}
		}
	}

	healthPercent := 0
	if totalPods > 0 {
		healthPercent = int(float64(healthyPods) / float64(totalPods) * 100)
	}

	result := gin.H{
		"totalPods":     totalPods,
		"healthyPods":   healthyPods,
		"healthPercent": healthPercent,
		"context":       contextName,
	}

	// Update cache
	podHealthCache = &result
	podHealthLastUpdate = time.Now()

	c.JSON(http.StatusOK, result)
}

// Usage examples:
//
// 1. Get all metrics summary:
//    GET /api/v1/metrics
//
// 2. Get specific metric:
//    GET /api/v1/metrics?name=http_requests_total
//
// 3. Get histogram buckets:
//    GET /api/v1/metrics?name=http_request_duration_seconds_bucket
//
// 4. Get raw Prometheus format:
//    GET /metrics
//    GET /api/v1/metrics?format=raw
//    GET /api/v1/metrics/raw
