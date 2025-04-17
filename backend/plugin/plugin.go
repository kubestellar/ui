package plugin

import "github.com/gin-gonic/gin"

// Plugin package has plugins that extend the core functionality of
// our backend using plugins

// plugin interface defines methods that a KS plugin must implement
// routes defines the routes to communicate with that

type Plugin interface {
	// name of the plugin
	Name() string
	// version of your plugin
	Version() string
	// plugin enabled or disabled 1 for enabled 0 for disbabled
	Enabled() int
	// routes and http methods to communicate with this plugin to do operations
	Routes() []PluginRoutesMeta
}

type PluginRoutesMeta struct {
	// http method
	Method string
	// route path
	Path string
	// route handler
	Handler func(c *gin.Context)
}
