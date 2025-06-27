package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
)

func main() {
	// Initialize Gin
	r := gin.Default()

	// Register the sample analytics plugin manually (backup plugin auto-registers via init())
	sampleAnalytics := plugins.NewSampleAnalytics()
	plugins.Pm.Register(sampleAnalytics)

	// Set up plugin routes
	plugins.Pm.SetupPluginsRoutes(r)

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Demo route to show plugin functionality
	r.GET("/demo/plugins", func(c *gin.Context) {
		pluginList := []map[string]interface{}{}

		for _, p := range plugins.Pm.GetPlugins() {
			pluginInfo := map[string]interface{}{
				"name":    p.Name(),
				"version": p.Version(),
				"enabled": p.Enabled() == 1,
				"routes":  []string{},
			}

			// Get plugin routes
			for _, route := range p.Routes() {
				pluginInfo["routes"] = append(pluginInfo["routes"].([]string), route.Method+" "+route.Path)
			}

			pluginList = append(pluginList, pluginInfo)
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"plugins": pluginList,
			"message": "Plugin system is working! The sample-analytics plugin should be listed above.",
		})
	})

	// Demo route to test plugin functionality
	r.GET("/demo/dynamic-test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message":   "Demo route is working!",
			"timestamp": "just now",
			"plugin":    "demo",
		})
	})

	// Plugin routes are already registered automatically when plugins are initialized

	log.Println("Plugin demo server starting on :8080")
	log.Println("Try these endpoints:")
	log.Println("  GET  http://localhost:8080/demo/plugins - List all plugins")
	log.Println("  GET  http://localhost:8080/demo/dynamic-test - Test demo route")
	log.Println("  GET  http://localhost:8080/api/plugins/sample-analytics/data - Sample analytics data")
	log.Println("  GET  http://localhost:8080/api/plugins/sample-analytics/metrics - Plugin metrics")

	r.Run(":8080")
}
