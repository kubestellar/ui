package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"

	"net/http"
	"strconv"
)

// Checks if a plugin is disabled
type IsPluginDisabled func(id int) bool

// PluginMiddleware checks if a plugin is disabled and returns 403
func PluginMiddleware(pluginChecker IsPluginDisabled) gin.HandlerFunc {
	return func(c *gin.Context) {

		pluginPath := c.Request.URL.Path
		// extract pluginID from pluginPath
		pluginIDStr := strings.Split(pluginPath, "/")[3]
		log.LogInfo("pluginIDStr", zap.String("pluginIDStr", pluginIDStr))

		log.LogInfo("PluginMiddleware", zap.String("pluginIDStr", pluginIDStr), zap.String("pluginPath", pluginPath))

		//  parse pluginID
		pluginID, err := strconv.Atoi(pluginIDStr)
		if err != nil {
			log.LogInfo("Invalid plugin ID")
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plugin ID"})
			c.Abort()
			return
		}

		// check if plugin is disabled
		if pluginChecker(pluginID) {
			log.LogInfo("Plugin is disabled")
			c.JSON(http.StatusForbidden, gin.H{"error": "Plugin is disabled"})
			c.Abort()
			return
		}

		c.Next()
	}
}
