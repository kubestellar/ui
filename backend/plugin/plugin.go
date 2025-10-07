package plugin

import "github.com/gin-gonic/gin"

// Metadata about routes of the plugin
type PluginRoutesMeta struct {
	// http method
	Method string
	// route path
	Path string
	// route handler
	Handler func(c *gin.Context)
}
