package plugin

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/common"
)

// Plugin is an alias for common.Plugin interface to maintain backward compatibility
type Plugin = common.Plugin

// PluginRoutesMeta extends common.PluginRoutesMeta with handler functionality
type PluginRoutesMeta struct {
	common.PluginRoutesMeta
	// route handler
	Handler func(c *gin.Context)
}
