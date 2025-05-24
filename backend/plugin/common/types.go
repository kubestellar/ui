package common

import "github.com/gin-gonic/gin"

// Plugin defines the interface that all plugins must implement
type Plugin interface {
	// Name returns the unique name of the plugin
	Name() string

	// Version returns the version of the plugin
	Version() string

	// Enabled returns an integer indicating if the plugin is enabled
	// Non-zero values indicate the plugin is enabled
	Enabled() int

	// Description returns a user-friendly description of the plugin
	Description() string

	// Routes returns information about the routes this plugin exposes
	Routes() []PluginRoutesMeta
}

// PluginRoutesMeta contains metadata about a plugin's route
type PluginRoutesMeta struct {
	// Method is the HTTP method (GET, POST, DELETE, etc.)
	Method string

	// Path is the URL path for the route
	Path string

	// Description is a user-friendly description of what the route does
	Description string

	// Handler is the route handler function
	Handler func(c *gin.Context)
}
