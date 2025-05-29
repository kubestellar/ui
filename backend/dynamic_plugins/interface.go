package dynamic_plugins

import (
    "github.com/gin-gonic/gin"
)

// PluginMetadata contains plugin information
type PluginMetadata struct {
    ID           string            `yaml:"id"`
    Name         string            `yaml:"name"`
    Version      string            `yaml:"version"`
    Description  string            `yaml:"description"`
    Author       string            `yaml:"author"`
    Endpoints    []EndpointConfig  `yaml:"endpoints"`
    Dependencies []string          `yaml:"dependencies"`
    Permissions  []string          `yaml:"permissions"`
    Compatibility map[string]string `yaml:"compatibility"`
}

// EndpointConfig defines plugin endpoint configuration
type EndpointConfig struct {
    Path    string `yaml:"path"`
    Method  string `yaml:"method"`
    Handler string `yaml:"handler"`
}

// KubestellarPlugin defines the interface that all dynamic plugins must implement
type KubestellarPlugin interface {
    Initialize(config map[string]interface{}) error
    GetMetadata() PluginMetadata
    GetHandlers() map[string]gin.HandlerFunc
    Health() error
    Cleanup() error
}

// PluginSymbol is the required symbol name in plugin .so files
const PluginSymbol = "NewPlugin"

// NewPluginFunc is the function signature for creating new plugin instances
type NewPluginFunc func() KubestellarPlugin