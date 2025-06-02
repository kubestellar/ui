# KubeStellar Dynamic Plugin System

A comprehensive, production-ready plugin system for KubeStellar that enables dynamic loading and management of plugins from GitHub repositories or local files.

## Overview

The KubeStellar Dynamic Plugin System provides:

- **Dynamic Loading**: Load plugins from GitHub repositories or local files
- **Hot Reloading**: Reload plugins without restarting the application
- **Health Monitoring**: Automatic health checks and status tracking
- **Security**: Plugin validation, sandboxing, and permission management
- **Performance**: Build caching, concurrent operations, and optimized loading
- **Extensibility**: Rich plugin interface with lifecycle management

## Architecture

### Core Components

1. **Plugin Interface** (`interface.go`): Defines the contract for all plugins
2. **Plugin Registry** (`registry.go`): Thread-safe plugin management and tracking
3. **Plugin Manager** (`manager.go`): Handles loading, building, and lifecycle
4. **Plugin Validator** (`validator.go`): Validates plugin metadata and security
5. **Health Checker** (`health.go`): Monitors plugin health and performance
6. **Plugin Service** (`../services/enhanced_plugin_service.go`): High-level API

### Plugin Structure

```
plugin/
├── main.go          # Plugin implementation
├── plugin.yaml      # Plugin manifest
├── build.sh         # Build script (optional)
└── README.md        # Plugin documentation
```

## Plugin Development

### 1. Plugin Interface

All plugins must implement the `KubestellarPlugin` interface:

```go
type KubestellarPlugin interface {
    // Core lifecycle methods
    Initialize(config map[string]interface{}) error
    GetMetadata() PluginMetadata
    GetHandlers() map[string]gin.HandlerFunc
    Health() error
    Cleanup() error

    // Enhanced methods
    Validate() error
    GetStatus() PluginStatus
    HandleError(err error) PluginError
    OnConfigChange(config map[string]interface{}) error
    GetMetrics() map[string]interface{}
    GetPermissions() []string
    ValidateRequest(c *gin.Context) error
    OnLoad() error
    OnUnload() error
}
```

### 2. Plugin Manifest (plugin.yaml)

```yaml
id: my-plugin
name: My Plugin
version: 1.0.0
description: A sample plugin
author: Developer Name

endpoints:
  - path: /hello
    method: GET
    handler: HelloHandler
    description: Returns a greeting

permissions:
  - resource.read
  - resource.write

dependencies:
  - k8s.io/client-go

configuration:
  timeout: '30s'
  retries: 3

security:
  network_access: true
  filesystem_access: false
  sandboxed: true

health:
  enabled: true
  interval_seconds: 30
```

### 3. Example Plugin Implementation

```go
package main

import (
    "github.com/gin-gonic/gin"
    "github.com/kubestellar/ui/dynamic_plugins"
)

type MyPlugin struct {
    initialized bool
}

func NewPlugin() dynamic_plugins.KubestellarPlugin {
    return &MyPlugin{}
}

func (p *MyPlugin) Initialize(config map[string]interface{}) error {
    p.initialized = true
    return nil
}

func (p *MyPlugin) GetMetadata() dynamic_plugins.PluginMetadata {
    return dynamic_plugins.PluginMetadata{
        ID:          "my-plugin",
        Name:        "My Plugin",
        Version:     "1.0.0",
        Description: "A sample plugin",
        Endpoints: []dynamic_plugins.EndpointConfig{
            {
                Path:    "/hello",
                Method:  "GET",
                Handler: "HelloHandler",
            },
        },
    }
}

func (p *MyPlugin) GetHandlers() map[string]gin.HandlerFunc {
    return map[string]gin.HandlerFunc{
        "HelloHandler": p.HelloHandler,
    }
}

func (p *MyPlugin) HelloHandler(c *gin.Context) {
    c.JSON(200, gin.H{"message": "Hello from plugin!"})
}

// Implement other required methods...
```

## Usage

### API Endpoints

#### Plugin Management

- `POST /api/plugins/load` - Load a plugin
- `GET /api/plugins` - List all plugins
- `GET /api/plugins/:id` - Get plugin details
- `DELETE /api/plugins/:id` - Unload plugin
- `POST /api/plugins/:id/reload` - Reload plugin

#### Plugin Control

- `POST /api/plugins/:id/enable` - Enable plugin
- `POST /api/plugins/:id/disable` - Disable plugin
- `GET /api/plugins/:id/status` - Get plugin status

#### System Operations

- `GET /api/plugins/system/metrics` - System metrics
- `GET /api/plugins/system/configuration` - Get configuration
- `PUT /api/plugins/system/configuration` - Update configuration

### Loading Plugins

#### From GitHub Repository

```bash
curl -X POST http://localhost:4000/api/plugins/load \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "https://github.com/user/plugin-repo",
    "version": "v1.0.0"
  }'
```

#### From Local File

```bash
curl -X POST http://localhost:4000/api/plugins/load \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "/path/to/plugin.so"
  }'
```

### Plugin Endpoints

Once loaded, plugin endpoints are available at:

```
/api/plugin-endpoints/{plugin-id}/{endpoint-path}
```

Example:

```
/api/plugin-endpoints/kubestellar-cluster-manager/onboard
```

## Cluster Plugin

The system includes a comprehensive cluster management plugin that extracts cluster operations from the main application:

### Features

- **Cluster Onboarding**: Add new clusters to KubeStellar
- **Cluster Detachment**: Remove clusters from management
- **Status Monitoring**: Track cluster states and health
- **Label Management**: Update cluster labels and metadata
- **Connectivity Validation**: Test cluster connectivity

### Endpoints

- `POST /api/plugin-endpoints/kubestellar-cluster-manager/onboard`
- `POST /api/plugin-endpoints/kubestellar-cluster-manager/detach`
- `GET /api/plugin-endpoints/kubestellar-cluster-manager/status`
- `PATCH /api/plugin-endpoints/kubestellar-cluster-manager/labels/:cluster`

### Building the Cluster Plugin

```bash
cd dynamic_plugins/cluster_plugin
./build.sh
```

### Loading the Cluster Plugin

```bash
curl -X POST http://localhost:4000/api/plugins/load \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "./dynamic_plugins/cache/kubestellar-cluster-manager.so"
  }'
```

## Configuration

### Environment Variables

- `PLUGIN_DIR`: Directory for plugin files (default: `./dynamic_plugins/cache`)
- `PLUGIN_CACHE_DIR`: Directory for build cache (default: `./dynamic_plugins/build_cache`)
- `PLUGIN_SECURITY_MODE`: Security mode (`strict`, `normal`, `permissive`)

### Security Configuration

```go
SecurityConfig{
    Mode:                "normal",
    AllowedRepos:        []string{"github.com/kubestellar/*"},
    MaxPluginSize:       100 * 1024 * 1024, // 100MB
    EnableSandboxing:    true,
    ValidateChecksums:   true,
}
```

## Monitoring and Metrics

### Health Checks

The system automatically monitors plugin health:

- **Interval**: Configurable (default: 30 seconds)
- **Timeout**: Configurable (default: 5 seconds)
- **Failure Threshold**: Configurable (default: 3 failures)

### Metrics

Available metrics include:

- Plugin count and status distribution
- Request counts per plugin
- Error rates and types
- Build cache statistics
- System resource usage

### Events

The system emits events for:

- Plugin loading/unloading
- Health status changes
- Configuration updates
- Error conditions

## Best Practices

### Plugin Development

1. **Error Handling**: Always implement proper error handling
2. **Resource Cleanup**: Clean up resources in the `Cleanup()` method
3. **Thread Safety**: Ensure thread-safe operations
4. **Validation**: Validate all inputs and configurations
5. **Documentation**: Provide clear documentation and examples

### Security

1. **Permissions**: Request only necessary permissions
2. **Input Validation**: Validate all user inputs
3. **Resource Limits**: Respect resource limits and timeouts
4. **Sandboxing**: Use sandboxed mode when possible

### Performance

1. **Caching**: Leverage build caching for faster loading
2. **Async Operations**: Use async operations for long-running tasks
3. **Resource Management**: Monitor and manage resource usage
4. **Optimization**: Optimize plugin size and dependencies

## Troubleshooting

### Common Issues

1. **Plugin Load Failures**

   - Check plugin manifest syntax
   - Verify dependencies are available
   - Check file permissions

2. **Build Errors**

   - Ensure Go version compatibility
   - Check dependency versions
   - Verify build environment

3. **Runtime Errors**
   - Check plugin logs
   - Verify configuration
   - Test plugin health endpoint

### Debug Mode

Enable debug logging:

```bash
export PLUGIN_DEBUG=true
```

### Log Analysis

Plugin logs include:

- Loading and initialization events
- Health check results
- Error details and stack traces
- Performance metrics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your plugin or enhancement
4. Add tests and documentation
5. Submit a pull request

## License

This project is licensed under the Apache 2.0 License.

# Dynamic Plugins Directory

This directory contains the dynamic plugin management system for KubeStellar UI.

## Structure

- `manager.go` - Core plugin management logic
- `manager_helpers.go` - Helper functions for plugin operations
- `interface.go` - Plugin interface definitions
- `cache/` - Runtime plugin cache (excluded from git)
- `build_cache/` - Plugin build cache (excluded from git)

## Purpose

This system enables dynamic loading and management of plugins from ZIP files uploaded through the frontend interface. Plugins are extracted, validated, built, and loaded at runtime without requiring server restarts.
