package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/plugins"
)

func GetPlugins(c *gin.Context) {
	pluginList := plugins.Pm.GetPlugins()
	pluginResponses := make([]gin.H, 0)

	for _, p := range pluginList {
		pluginResponses = append(pluginResponses, gin.H{
			"name":     p.Name(),
			"version":  p.Version(),
			"enabled":  p.Enabled(),
			"status":   getPluginStatus(p.Enabled()),
			"type":     "static", // Default to static for now
		})
	}

	c.JSON(http.StatusOK, pluginResponses)
}

func getPluginStatus(enabled int) string {
	if enabled == 1 {
		return "active"
	}
	return "idle"
}

func GetPluginStats(c *gin.Context) {
	pluginName := c.Param("name")

	c.Set("pluginName", pluginName)
	stats := map[string]interface{}{
		"usageCount":         50,
		"lastExecutionTime":  time.Now().Add(-24 * time.Hour).Format(time.RFC3339),
		"averageResponseTime": 120,
		"successRate":        98.5,
		"errors":             2,
		"status": map[string]string{
			"memory": "45MB",
			"cpu":    "2%",
		},
	}

	if pluginName == "backup-plugin" {
		stats["usageCount"] = 75
		stats["successRate"] = 99.8
	}

	c.JSON(http.StatusOK, stats)
}
