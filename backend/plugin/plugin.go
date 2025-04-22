package plugin

import "github.com/gin-gonic/gin"

// plugin interface defines methods that a KS plugin must implement
type Plugin interface {
	// name of the plugin
	Name() string
	// version of your plugin
	Version() string
	// plugin enabled or disabled 1 for enabled 0 for disabled
	Enabled() int
	// routes and http methods to communicate with this plugin to do operations
	Routes() []PluginRoutesMeta
}

// Metadata about routes of the plugin
type PluginRoutesMeta struct {
	// http method
	Method string
	// route path
	Path string
	// route handler
	Handler func(c *gin.Context)
}
