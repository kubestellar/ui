package pluginapi

import "github.com/gin-gonic/gin"

// KubestellarPlugin defines the interface for plugins
type KubestellarPlugin interface {
	Initialize(config map[string]interface{}) error
	GetMetadata() PluginMetadata
	GetHandlers() map[string]gin.HandlerFunc
	Health() error
	Cleanup() error
}

// PluginMetadata holds metadata about the plugin
type PluginMetadata struct {
	ID          string
	Name        string
	Version     string
	Description string
	Author      string
}
