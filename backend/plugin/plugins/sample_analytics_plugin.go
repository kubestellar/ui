package plugins

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	"go.uber.org/zap"
)

// SampleAnalyticsPlugin demonstrates a comprehensive plugin with all features
type SampleAnalyticsPlugin struct {
	*plugin.PluginTemplate
	analytics *AnalyticsService
}

// AnalyticsService handles analytics data
type AnalyticsService struct {
	data    map[string]interface{}
	metrics map[string]int64
}

// AnalyticsData represents analytics information
type AnalyticsData struct {
	PageViews    int64                  `json:"page_views"`
	UniqueUsers  int64                  `json:"unique_users"`
	Sessions     int64                  `json:"sessions"`
	Events       []AnalyticsEvent       `json:"events"`
	TopPages     []PageStats            `json:"top_pages"`
	UserActivity map[string]interface{} `json:"user_activity"`
	Timestamp    time.Time              `json:"timestamp"`
}

// AnalyticsEvent represents a user event
type AnalyticsEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	UserID    string                 `json:"user_id,omitempty"`
	Page      string                 `json:"page"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data,omitempty"`
}

// PageStats represents page statistics
type PageStats struct {
	URL   string `json:"url"`
	Views int64  `json:"views"`
	Title string `json:"title"`
}

// NewSampleAnalyticsPlugin creates a new instance of the sample analytics plugin
func NewSampleAnalyticsPlugin() *SampleAnalyticsPlugin {
	// Create the plugin manifest
	manifest := plugin.CreateManifest(
		"sample-analytics",
		"1.0.0",
		"A comprehensive sample analytics plugin demonstrating all plugin features",
		"KubeStellar Team",
	)

	// Configure backend routes
	manifest.Backend.Routes = []plugin.PluginRoute{
		{
			Path:        "/api/plugins/sample-analytics/data",
			Method:      "GET",
			Handler:     "GetAnalyticsData",
			Description: "Get analytics data",
			Response: plugin.ResponseSchema{
				Type:        "object",
				Description: "Analytics data response",
			},
		},
		{
			Path:        "/api/plugins/sample-analytics/track",
			Method:      "POST",
			Handler:     "TrackEvent",
			Description: "Track a user event",
			Parameters: []plugin.RouteParameter{
				{
					Name:        "event",
					Type:        "object",
					Required:    true,
					Description: "Event data to track",
				},
			},
		},
		{
			Path:        "/api/plugins/sample-analytics/metrics",
			Method:      "GET",
			Handler:     "GetMetrics",
			Description: "Get plugin metrics",
		},
		{
			Path:        "/api/plugins/sample-analytics/config",
			Method:      "PUT",
			Handler:     "UpdateConfig",
			Description: "Update plugin configuration",
		},
	}

	// Configure frontend widgets
	manifest.Frontend.Widgets = []plugin.PluginWidgetConfig{
		{
			Name:        "analytics-overview",
			Type:        "card",
			Title:       "Analytics Overview",
			Description: "Overview of key analytics metrics",
			Component:   "AnalyticsOverviewCard",
			Size: plugin.WidgetSize{
				Width:  "md",
				Height: "md",
			},
			Position: plugin.WidgetPosition{
				Area:   "main",
				Row:    1,
				Column: 1,
			},
		},
		{
			Name:        "analytics-chart",
			Type:        "chart",
			Title:       "Page Views Chart",
			Description: "Visual representation of page view trends",
			Component:   "AnalyticsChart",
			Size: plugin.WidgetSize{
				Width:  "lg",
				Height: "lg",
			},
			Position: plugin.WidgetPosition{
				Area:   "main",
				Row:    1,
				Column: 2,
			},
		},
		{
			Name:        "top-pages",
			Type:        "table",
			Title:       "Top Pages",
			Description: "Most visited pages",
			Component:   "TopPagesTable",
			Size: plugin.WidgetSize{
				Width:  "md",
				Height: "sm",
			},
			Position: plugin.WidgetPosition{
				Area:   "main",
				Row:    2,
				Column: 1,
			},
		},
		{
			Name:        "real-time-activity",
			Type:        "metrics",
			Title:       "Real-time Activity",
			Description: "Live user activity metrics",
			Component:   "RealTimeActivity",
			Size: plugin.WidgetSize{
				Width:  "sm",
				Height: "sm",
			},
			Position: plugin.WidgetPosition{
				Area:   "sidebar",
				Row:    1,
				Column: 1,
			},
		},
	}

	// Configure frontend routes
	manifest.Frontend.Routes = []plugin.FrontendRoute{
		{
			Path:        "/analytics",
			Component:   "AnalyticsDashboard",
			Name:        "Analytics Dashboard",
			Icon:        "HiChartBarIcon",
			Description: "Comprehensive analytics dashboard",
			Protected:   true,
			Permissions: []string{"analytics:read"},
		},
		{
			Path:        "/analytics/reports",
			Component:   "AnalyticsReports",
			Name:        "Analytics Reports",
			Icon:        "HiDocumentChartBarIcon",
			Description: "Detailed analytics reports",
			Protected:   true,
			Permissions: []string{"analytics:read", "reports:read"},
		},
	}

	// Configure navigation
	manifest.Frontend.Navigation = []plugin.PluginNavigationItem{
		{
			Path:  "/analytics",
			Label: "Analytics",
			Icon:  "HiChartBarIcon",
			Order: 100,
		},
		{
			Path:        "/analytics/reports",
			Label:       "Reports",
			Icon:        "HiDocumentChartBarIcon",
			Order:       101,
			Parent:      "/analytics",
			Permissions: []string{"reports:read"},
		},
	}

	// Set additional metadata
	manifest.Icon = "📊"
	manifest.Keywords = []string{"analytics", "metrics", "dashboard", "tracking"}
	manifest.License = "MIT"
	manifest.Homepage = "https://github.com/kubestellar/ui2/plugins/sample-analytics"

	// Configure plugin settings
	manifest.Config = map[string]interface{}{
		"tracking_enabled":    true,
		"data_retention_days": 90,
		"sample_rate":         1.0,
		"exclude_bots":        true,
		"real_time_updates":   true,
	}

	// Create analytics service
	analytics := &AnalyticsService{
		data:    make(map[string]interface{}),
		metrics: make(map[string]int64),
	}

	// Initialize with sample data
	analytics.initSampleData()

	// Create plugin template
	template := plugin.NewPluginTemplate(manifest)

	return &SampleAnalyticsPlugin{
		PluginTemplate: template,
		analytics:      analytics,
	}
}

// Initialize sample data
func (as *AnalyticsService) initSampleData() {
	// Generate sample metrics
	as.metrics["page_views"] = 15847
	as.metrics["unique_users"] = 2847
	as.metrics["sessions"] = 5632
	as.metrics["bounce_rate"] = 45

	// Sample events
	events := []AnalyticsEvent{
		{
			ID:        "evt_001",
			Type:      "page_view",
			UserID:    "user_123",
			Page:      "/dashboard",
			Timestamp: time.Now().Add(-2 * time.Hour),
			Data:      map[string]interface{}{"referrer": "google.com"},
		},
		{
			ID:        "evt_002",
			Type:      "button_click",
			UserID:    "user_456",
			Page:      "/analytics",
			Timestamp: time.Now().Add(-1 * time.Hour),
			Data:      map[string]interface{}{"button": "export_report"},
		},
	}

	as.data["events"] = events

	// Sample top pages
	topPages := []PageStats{
		{URL: "/dashboard", Views: 5847, Title: "Dashboard"},
		{URL: "/analytics", Views: 3621, Title: "Analytics"},
		{URL: "/clusters", Views: 2947, Title: "Clusters"},
		{URL: "/workloads", Views: 2103, Title: "Workloads"},
		{URL: "/settings", Views: 1329, Title: "Settings"},
	}

	as.data["top_pages"] = topPages
}

// Override Routes method to provide actual handlers
func (sap *SampleAnalyticsPlugin) Routes() []plugin.PluginRoutesMeta {
	return []plugin.PluginRoutesMeta{
		{
			Method:  "GET",
			Path:    "/api/plugins/sample-analytics/data",
			Handler: sap.GetAnalyticsData,
		},
		{
			Method:  "POST",
			Path:    "/api/plugins/sample-analytics/track",
			Handler: sap.TrackEvent,
		},
		{
			Method:  "GET",
			Path:    "/api/plugins/sample-analytics/metrics",
			Handler: sap.GetMetrics,
		},
		{
			Method:  "PUT",
			Path:    "/api/plugins/sample-analytics/config",
			Handler: sap.UpdateConfig,
		},
		{
			Method:  "GET",
			Path:    "/api/plugins/sample-analytics/health",
			Handler: sap.HealthEndpoint,
		},
	}
}

// Route Handlers

// GetAnalyticsData returns analytics data
func (sap *SampleAnalyticsPlugin) GetAnalyticsData(c *gin.Context) {
	log.LogInfo("Analytics data requested",
		zap.String("plugin", sap.Name()),
		zap.String("endpoint", "/data"))

	// Get query parameters
	timeRange := c.DefaultQuery("range", "24h")
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "50")

	// Convert page and limit to integers
	pageNum, _ := strconv.Atoi(page)
	limitNum, _ := strconv.Atoi(limit)

	// Prepare analytics data
	analyticsData := AnalyticsData{
		PageViews:   sap.analytics.metrics["page_views"],
		UniqueUsers: sap.analytics.metrics["unique_users"],
		Sessions:    sap.analytics.metrics["sessions"],
		Timestamp:   time.Now(),
	}

	// Add events if available
	if events, ok := sap.analytics.data["events"].([]AnalyticsEvent); ok {
		analyticsData.Events = events
	}

	// Add top pages if available
	if topPages, ok := sap.analytics.data["top_pages"].([]PageStats); ok {
		analyticsData.TopPages = topPages
	}

	// Simulate user activity based on time range
	userActivity := make(map[string]interface{})
	switch timeRange {
	case "1h":
		userActivity["current_users"] = 47
		userActivity["avg_session_duration"] = "4m 32s"
	case "24h":
		userActivity["current_users"] = 23
		userActivity["avg_session_duration"] = "6m 15s"
	case "7d":
		userActivity["current_users"] = 156
		userActivity["avg_session_duration"] = "5m 48s"
	default:
		userActivity["current_users"] = 23
		userActivity["avg_session_duration"] = "6m 15s"
	}

	analyticsData.UserActivity = userActivity

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    analyticsData,
		"pagination": gin.H{
			"page":  pageNum,
			"limit": limitNum,
			"total": len(analyticsData.Events),
		},
		"meta": gin.H{
			"time_range": timeRange,
			"generated":  time.Now(),
			"plugin":     sap.Name(),
		},
	})
}

// TrackEvent tracks a new event
func (sap *SampleAnalyticsPlugin) TrackEvent(c *gin.Context) {
	var event AnalyticsEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid event data: " + err.Error(),
		})
		return
	}

	// Set timestamp and ID if not provided
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	if event.ID == "" {
		event.ID = fmt.Sprintf("evt_%d", time.Now().UnixNano())
	}

	// Store the event
	if events, ok := sap.analytics.data["events"].([]AnalyticsEvent); ok {
		events = append(events, event)
		sap.analytics.data["events"] = events
	} else {
		sap.analytics.data["events"] = []AnalyticsEvent{event}
	}

	// Update metrics based on event type
	switch event.Type {
	case "page_view":
		sap.analytics.metrics["page_views"]++
	case "button_click", "link_click":
		if _, exists := sap.analytics.metrics["interactions"]; !exists {
			sap.analytics.metrics["interactions"] = 0
		}
		sap.analytics.metrics["interactions"]++
	}

	log.LogInfo("Event tracked",
		zap.String("plugin", sap.Name()),
		zap.String("event_type", event.Type),
		zap.String("event_id", event.ID))

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"event_id": event.ID,
		"message":  "Event tracked successfully",
	})
}

// GetMetrics returns plugin metrics
func (sap *SampleAnalyticsPlugin) GetMetrics(c *gin.Context) {
	baseMetrics := sap.PluginTemplate.GetMetrics()

	// Add analytics-specific metrics
	analyticsMetrics := map[string]interface{}{
		"plugin_metrics": baseMetrics,
		"analytics_data": sap.analytics.metrics,
		"data_points":    len(sap.analytics.data),
		"last_event":     time.Now().Add(-15 * time.Minute), // Simulate recent activity
		"health_status":  "healthy",
		"uptime":         "48h 32m",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"metrics": analyticsMetrics,
	})
}

// UpdateConfig updates plugin configuration
func (sap *SampleAnalyticsPlugin) UpdateConfig(c *gin.Context) {
	var newConfig map[string]interface{}
	if err := c.ShouldBindJSON(&newConfig); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid configuration data: " + err.Error(),
		})
		return
	}

	// Update configuration
	err := sap.PluginTemplate.OnConfigUpdate(newConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update configuration: " + err.Error(),
		})
		return
	}

	log.LogInfo("Plugin configuration updated",
		zap.String("plugin", sap.Name()),
		zap.Any("config", newConfig))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Configuration updated successfully",
		"config":  sap.GetConfiguration(),
	})
}

// HealthEndpoint provides health check
func (sap *SampleAnalyticsPlugin) HealthEndpoint(c *gin.Context) {
	err := sap.PluginTemplate.HealthCheck()

	health := gin.H{
		"plugin":    sap.Name(),
		"version":   sap.Version(),
		"status":    "healthy",
		"timestamp": time.Now(),
		"uptime":    "48h 32m", // This would be calculated in a real plugin
		"metrics": gin.H{
			"events_tracked": len(sap.analytics.data),
			"metrics_count":  len(sap.analytics.metrics),
			"memory_usage":   "2.3MB", // This would be calculated in a real plugin
		},
	}

	if err != nil {
		health["status"] = "unhealthy"
		health["error"] = err.Error()
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"health":  health,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"health":  health,
	})
}

// Override enhanced plugin methods

// Install method
func (sap *SampleAnalyticsPlugin) Install(config map[string]interface{}) error {
	err := sap.PluginTemplate.Install(config)
	if err != nil {
		return err
	}

	log.LogInfo("Sample Analytics Plugin installed",
		zap.String("plugin", sap.Name()),
		zap.String("version", sap.Version()))

	return nil
}

// OnEnable method
func (sap *SampleAnalyticsPlugin) OnEnable() error {
	err := sap.PluginTemplate.OnEnable()
	if err != nil {
		return err
	}

	log.LogInfo("Sample Analytics Plugin enabled",
		zap.String("plugin", sap.Name()))

	// Start any background processes here
	// For example, data collection, periodic cleanup, etc.

	return nil
}

// OnDisable method
func (sap *SampleAnalyticsPlugin) OnDisable() error {
	err := sap.PluginTemplate.OnDisable()
	if err != nil {
		return err
	}

	log.LogInfo("Sample Analytics Plugin disabled",
		zap.String("plugin", sap.Name()))

	// Stop any background processes here

	return nil
}

// GetAnalyticsService returns the analytics service for testing
func (sap *SampleAnalyticsPlugin) GetAnalyticsService() *AnalyticsService {
	return sap.analytics
}

// Demo method to add dynamic routes
func (sap *SampleAnalyticsPlugin) AddDynamicRoute(path, method string, handler gin.HandlerFunc) error {
	route := plugin.PluginRoute{
		Path:        path,
		Method:      method,
		Handler:     "DynamicHandler",
		Description: "Dynamically added route",
	}

	return sap.RegisterDynamicRoute(route, handler)
}

// Export function to create plugin instance (used by plugin manager)
func NewSampleAnalytics() plugin.Plugin {
	return NewSampleAnalyticsPlugin()
}
