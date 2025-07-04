package api

import (
	"fmt"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	dto "github.com/prometheus/client_model/go"
	"go.uber.org/zap"
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

// GetMetrics returns filtered/parsed metrics in JSON format
func GetMetrics(c *gin.Context) {
	logger := getLogger()
	
	// Optional metric name filter
	metricsName := c.Query("name")
	format := c.DefaultQuery("format", "json")
	
	// If no filter and raw format requested, redirect to raw metrics
	if metricsName == "" && format == "raw" {
		GetRawMetrics(c)
		return
	}
	
	// Get metrics from registry directly instead of HTTP call
	metricFamilies, err := getRegistry().Gather()
	if err != nil {
		logger.Error("failed to gather metrics", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to gather metrics"})
		return
	}
	
	// Convert to map for easier lookup
	familyMap := make(map[string]*dto.MetricFamily)
	for _, mf := range metricFamilies {
		familyMap[mf.GetName()] = mf
	}
	
	// If specific metric requested
	if metricsName != "" {
		result, err := getSpecificMetric(familyMap, metricsName)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, result)
		return
	}
	
	// Return all metrics summary
	summary := generateMetricsSummary(familyMap)
	c.JSON(http.StatusOK, summary)
}

// getSpecificMetric extracts a specific metric from the family map
func getSpecificMetric(familyMap map[string]*dto.MetricFamily, metricsName string) (interface{}, error) {
	baseName, suffix := parseMetricName(metricsName)
	
	mf, ok := familyMap[baseName]
	if !ok {
		return nil, fmt.Errorf("metric '%s' not found", baseName)
	}
	
	results := []gin.H{}
	metricType := mf.GetType()
	
	for _, m := range mf.GetMetric() {
		labels := make(gin.H)
		for _, l := range m.GetLabel() {
			labels[l.GetName()] = l.GetValue()
		}
		
		var value interface{}
		
		switch metricType {
		case dto.MetricType_COUNTER:
			if suffix == "" {
				value = m.GetCounter().GetValue()
			}
		case dto.MetricType_GAUGE:
			if suffix == "" {
				value = m.GetGauge().GetValue()
			}
		case dto.MetricType_HISTOGRAM:
			value = processHistogram(m.GetHistogram(), suffix)
		case dto.MetricType_SUMMARY:
			value = processSummary(m.GetSummary(), suffix)
		}
		
		if value != nil {
			metricData := gin.H{"value": value}
			if len(labels) > 0 {
				metricData["labels"] = labels
			}
			results = append(results, metricData)
		}
	}
	
	if len(results) == 0 {
		return nil, fmt.Errorf("metric component not found or suffix '%s' is not applicable for this metric type", suffix)
	}
	
	// Return single result if only one metric and no labels
	if len(results) == 1 {
		labels, ok := results[0]["labels"].(gin.H)
		if !ok || len(labels) == 0 {
			return results[0], nil
		}
	}
	
	return results, nil
}

// generateMetricsSummary creates a summary of all available metrics
func generateMetricsSummary(familyMap map[string]*dto.MetricFamily) gin.H {
	summary := gin.H{
		"total_metrics": len(familyMap),
		"metrics":       make([]gin.H, 0, len(familyMap)),
		"types": gin.H{
			"counter":   0,
			"gauge":     0,
			"histogram": 0,
			"summary":   0,
		},
	}
	
	for name, mf := range familyMap {
		metricType := mf.GetType().String()
		
		// Count metric types
		switch mf.GetType() {
		case dto.MetricType_COUNTER:
			summary["types"].(gin.H)["counter"] = summary["types"].(gin.H)["counter"].(int) + 1
		case dto.MetricType_GAUGE:
			summary["types"].(gin.H)["gauge"] = summary["types"].(gin.H)["gauge"].(int) + 1
		case dto.MetricType_HISTOGRAM:
			summary["types"].(gin.H)["histogram"] = summary["types"].(gin.H)["histogram"].(int) + 1
		case dto.MetricType_SUMMARY:
			summary["types"].(gin.H)["summary"] = summary["types"].(gin.H)["summary"].(int) + 1
		}
		
		metricInfo := gin.H{
			"name":        name,
			"type":        metricType,
			"help":        mf.GetHelp(),
			"sample_count": len(mf.GetMetric()),
		}
		
		summary["metrics"] = append(summary["metrics"].([]gin.H), metricInfo)
	}
	
	return summary
}

// processHistogram handles histogram metric processing
func processHistogram(h *dto.Histogram, suffix string) interface{} {
	switch suffix {
	case "_sum":
		return h.GetSampleSum()
	case "_count":
		return h.GetSampleCount()
	case "_bucket":
		return processBuckets(h.GetBucket())
	case "":
		return gin.H{
			"count":   h.GetSampleCount(),
			"sum":     h.GetSampleSum(),
			"buckets": processBuckets(h.GetBucket()),
		}
	}
	return nil
}

// processSummary handles summary metric processing
func processSummary(s *dto.Summary, suffix string) interface{} {
	switch suffix {
	case "_sum":
		return s.GetSampleSum()
	case "_count":
		return s.GetSampleCount()
	case "":
		quantiles := make([]gin.H, len(s.GetQuantile()))
		for i, q := range s.GetQuantile() {
			quantiles[i] = gin.H{
				"quantile": q.GetQuantile(),
				"value":    q.GetValue(),
			}
		}
		return gin.H{
			"count":     s.GetSampleCount(),
			"sum":       s.GetSampleSum(),
			"quantiles": quantiles,
		}
	}
	return nil
}

// processBuckets processes histogram buckets
func processBuckets(buckets []*dto.Bucket) []gin.H {
	processed := make([]gin.H, len(buckets))
	for i, b := range buckets {
		upperBound := b.GetUpperBound()
		var boundValue interface{}
		
		// Check for positive infinity and convert it to a string for JSON compatibility
		if math.IsInf(upperBound, 1) {
			boundValue = "+Inf"
		} else {
			boundValue = upperBound
		}
		
		processed[i] = gin.H{
			"cumulative_count": b.GetCumulativeCount(),
			"upper_bound":      boundValue,
		}
	}
	return processed
}

// parseMetricName separates metric name from suffix
func parseMetricName(metricName string) (string, string) {
	suffixes := []string{"_bucket", "_sum", "_count"}
	for _, suffix := range suffixes {
		if strings.HasSuffix(metricName, suffix) {
			return strings.TrimSuffix(metricName, suffix), suffix
		}
	}
	return metricName, ""
}

// Helper functions
func getRegistry() prometheus.Gatherer {
	if defaultConfig != nil && defaultConfig.Registry != nil {
		return defaultConfig.Registry
	}
	return prometheus.DefaultGatherer
}

func getLogger() *zap.Logger {
	if defaultConfig != nil && defaultConfig.Logger != nil {
		return defaultConfig.Logger
	}
	// Fallback logger
	logger, _ := zap.NewProduction()
	return logger
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
	
	// JSON API for metrics (for frontend/API consumption)
	metricsGroup := router.Group("/api/v1")
	{
		metricsGroup.GET("/metrics", GetMetrics)
		metricsGroup.GET("/metrics/raw", GetRawMetrics)
	}
	
	logger.Info("Metrics endpoints configured",
		zap.String("raw_metrics", "/metrics"),
		zap.String("json_metrics", "/api/v1/metrics"),
		zap.String("raw_api", "/api/v1/metrics/raw"))
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