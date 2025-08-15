# Installing Plugins from Local

This guide explains how to install plugins locally in the KubeStellar UI system. Local plugin installation allows you to develop and test custom plugins before publishing them to the marketplace.

## Overview

Local plugin installation supports uploading plugin packages in `.tar.gz` format through the web interface. The system validates the plugin structure, extracts the package, and installs it for the current user.

## Plugin Structure Requirements

A valid plugin package must contain the following structure when extracted:

```
plugin-package/
├── plugin.yml          # Plugin manifest (required)
├── plugin-name.wasm    # WebAssembly binary (required)
└── frontend/           # Frontend assets (optional)
    ├── dist/
    ├── src/
    └── package.json
```

### Plugin Manifest (`plugin.yml`)

The plugin manifest file defines the plugin's metadata and configuration. Here's an example structure:

```yaml
apiVersion: cluster-monitor/v1
kind: Plugin
metadata:
  name: "my-plugin"
  version: "1.0.0"
  author: "your-username"
  description: "Description of your plugin functionality"
spec:
  # Plugin binary information
  wasm:
    file: "my-plugin.wasm"
    entrypoint: "main"
    memory_limit: "64MB"
  
  # Go-specific build information
  build:
    go_version: "1.21"
    tinygo_version: "0.30.0"
  
  # Backend integration
  backend:
    enabled: true
    routes:
      - path: "/status"
        methods: ["GET"]
        handler: "handle_status"
      - path: "/data"
        methods: ["GET"]
        handler: "handle_data"
  
  # Frontend integration
  frontend:
    enabled: true
    navigation:
      - label: "My Plugin"
        icon: "icon.svg"
        path: "/plugins/my-plugin"
    routes:
      - path: "/plugins/my-plugin"
        component: "plugin-component.js"
  
  # Basic permissions
  permissions:
    - "kubestellar:read:clusters"
    - "kubestellar:read:workloads"
```

### Minimal Plugin Manifest

For basic plugins, you can use a simplified manifest:

```yaml
metadata:
  name: "simple-plugin"
  version: "1.0.0"
  description: "A simple test plugin"
  author: "your-username"

spec:
  wasm:
    file: "simple-plugin.wasm"
  routes:
    - /test/status
    - /test/data
```

## Building a Plugin Package

### 1. Create Your Plugin Source

Start with a Go project that implements your plugin functionality:

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    // Plugin initialization code
}

func handle_status(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Plugin is running")
}

func handle_data(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Plugin data")
}
```

### 2. Build the WebAssembly Binary

Use TinyGo to compile your Go code to WebAssembly:

```bash
tinygo build -o my-plugin.wasm -target wasi main.go
```

### 3. Create the Plugin Manifest

Create a `plugin.yml` file with your plugin's metadata and configuration.

### 4. Package the Plugin

Create a `.tar.gz` archive containing your plugin files:

```bash
tar -czf my-plugin.tar.gz plugin.yml my-plugin.wasm frontend/
```

## Installation Process

### Prerequisites

1. **User Authentication**: You must be logged in to the KubeStellar UI
2. **Author Registration**: The plugin author (specified in `plugin.yml`) must exist in the system database
3. **File Format**: Plugin must be packaged as a `.tar.gz` file

### Installation Steps

1. **Access Plugin Manager**
   - Navigate to the Plugin Manager in the KubeStellar UI
   - Click on the "Install" section

2. **Choose Installation Method**
   - Select "Local" installation method
   - This enables file upload functionality

3. **Upload Plugin Package**
   - Click "Browse" to select your `.tar.gz` plugin file
   - The system will validate the file format
   - Ensure the file contains the required `plugin.yml` and `.wasm` files

4. **Install Plugin**
   - Click "Install Plugin" to begin the installation process
   - The system will:
     - Extract the plugin package
     - Validate the plugin manifest
     - Check for existing plugins with the same name/version
     - Install the plugin to the local plugins directory
     - Load the plugin dynamically

5. **Verification**
   - Check the plugin status in the Plugin Manager
   - Verify the plugin appears in the installed plugins list
   - Test plugin functionality if applicable

## Installation Validation

The system performs several validation checks during installation:

### File Validation
- File must be a valid `.tar.gz` archive
- Archive must contain `plugin.yml` manifest
- Archive must contain the specified `.wasm` file

### Plugin Validation
- Plugin name must be unique (not already installed)
- Plugin author must exist in the system database
- Plugin manifest must be valid YAML format
- Required metadata fields must be present

### Installation Checks
- Plugin directory creation
- File copying and permissions
- Dynamic plugin loading
- Database record creation

## Troubleshooting

### Common Issues

1. **"Invalid file type" Error**
   - Ensure your plugin is packaged as `.tar.gz`
   - Verify the archive is not corrupted

2. **"plugin.yml not found" Error**
   - Check that `plugin.yml` is in the root of your archive
   - Verify the file name is exactly `plugin.yml`

3. **"WASM file not found" Error**
   - Ensure the `.wasm` file specified in `plugin.yml` exists in the archive
   - Check the `file` field in the `wasm` section of your manifest

4. **"Author not found" Error**
   - The plugin author must be registered in the system
   - Contact an administrator to add the author to the database

5. **"Plugin already installed" Error**
   - Uninstall the existing plugin first
   - Or use a different version number in your manifest

### Plugin Loading Issues

If installation succeeds but the plugin fails to load:

1. Check the plugin logs for specific error messages
2. Verify the WebAssembly binary is compatible with the system
3. Ensure all required dependencies are included
4. Test the plugin in a development environment first

## Example: Complete Plugin Development

Here's a complete example of creating and installing a simple plugin:

### 1. Create Plugin Source (`main.go`)

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type Response struct {
    Status  string `json:"status"`
    Message string `json:"message"`
}

func main() {
    // Plugin initialization
    fmt.Println("Simple plugin loaded")
}

func handle_status(w http.ResponseWriter, r *http.Request) {
    response := Response{
        Status:  "ok",
        Message: "Plugin is running",
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func handle_data(w http.ResponseWriter, r *http.Request) {
    response := Response{
        Status:  "ok",
        Message: "Plugin data endpoint",
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

### 2. Create Plugin Manifest (`plugin.yml`)

```yaml
metadata:
  name: "simple-example"
  version: "1.0.0"
  description: "A simple example plugin"
  author: "your-username"

spec:
  wasm:
    file: "simple-example.wasm"
  routes:
    - /example/status
    - /example/data
```

### 3. Build and Package

```bash
# Build the WebAssembly binary
tinygo build -o simple-example.wasm -target wasi main.go

# Create the plugin package
tar -czf simple-example.tar.gz plugin.yml simple-example.wasm
```

### 4. Install via UI

1. Open the Plugin Manager
2. Select "Local" installation method
3. Upload `simple-example.tar.gz`
4. Click "Install Plugin"

## Best Practices

1. **Version Management**: Use semantic versioning for your plugins
2. **Testing**: Test plugins thoroughly before installation
3. **Documentation**: Include clear descriptions and usage instructions
4. **Error Handling**: Implement proper error handling in your plugin code
5. **Security**: Validate all inputs and outputs in your plugin handlers
6. **Performance**: Optimize your WebAssembly binary for size and speed

## Plugin Management

After installation, you can:

- **Enable/Disable**: Toggle plugin functionality
- **Reload**: Refresh plugin without reinstalling
- **Uninstall**: Remove the plugin completely
- **View Details**: Check plugin status, load time, and configuration

## Plugin API Endpoints

After installing plugins, you can interact with them through the REST API endpoints. The plugin system provides several endpoints for managing and checking plugin status.

### Base URL
```
http://localhost:4000/api/plugins
```

### Authentication
All plugin API endpoints require authentication using JWT tokens. The token can be retrieved from the browser's local storage after logging in to the KubeStellar UI.

### Get All Installed Plugins

**Endpoint:** `GET /api/plugins`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Response Example:**
```json
{
    "count": 1,
    "plugins": [
        {
            "id": 26,
            "name": "cluster-monitor",
            "version": "1.0.0",
            "enabled": true,
            "description": "Simple cluster monitoring dashboard",
            "author": "admin",
            "createdAt": "2025-08-15T15:40:16.511496+05:30",
            "updatedAt": "2025-08-15T15:40:16.511496+05:30",
            "routes": [
                "GET /status",
                "GET /data",
                "POST /read"
            ],
            "status": "active"
        }
    ]
}
```

**Response Fields:**
- `count`: Total number of installed plugins
- `plugins`: Array of plugin objects containing:
  - `id`: Unique plugin identifier
  - `name`: Plugin name from manifest
  - `version`: Plugin version
  - `enabled`: Whether the plugin is currently enabled
  - `description`: Plugin description
  - `author`: Plugin author username
  - `createdAt`: Installation timestamp
  - `updatedAt`: Last update timestamp
  - `routes`: Array of available plugin routes
  - `status`: Plugin status ("active", "inactive", "loading", "error")

### Get Specific Plugin

**Endpoint:** `GET /api/plugins/{pluginId}`

**Example:**
```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26
```

### Enable Plugin

**Endpoint:** `POST /api/plugins/{pluginId}/enable`

**Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26/enable
```

### Disable Plugin

**Endpoint:** `POST /api/plugins/{pluginId}/disable`

**Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26/disable
```

### Reload Plugin

**Endpoint:** `POST /api/plugins/{pluginId}/reload`

**Example:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26/reload
```

### Uninstall Plugin

**Endpoint:** `DELETE /api/plugins/{pluginId}`

**Example:**
```bash
curl -X DELETE \
     -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26
```

### Get Plugin Status

**Endpoint:** `GET /api/plugins/{pluginId}/status`

This endpoint provides detailed status information about a specific plugin, including its health status and any feedback from the plugin itself.

**Example:**
```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:4000/api/plugins/26/status
```

**Response Example:**
```json
{
    "status": "healthy"
}
```

**Possible Status Values:**
- **`healthy`**: Plugin is running normally and responding to requests
- **`unhealthy`**: Plugin is installed but not functioning properly
- **`loading`**: Plugin is currently being initialized
- **`error`**: Plugin has encountered an error
- **`disabled`**: Plugin is installed but disabled

### Plugin Feedback and Health Monitoring

The status endpoint serves multiple purposes:

1. **Health Check**: Verify if the plugin is running and responding
2. **Plugin Feedback**: Get status information directly from the plugin
3. **Troubleshooting**: Identify issues with plugin functionality
4. **Monitoring**: Track plugin performance and availability

**Advanced Status Response Example:**
```json
{
    "status": "healthy",
    "uptime": "2h 15m 30s",
    "version": "1.0.0",
    "lastCheck": "2025-08-15T15:40:16.511496+05:30",
    "metrics": {
        "requests": 150,
        "errors": 0,
        "responseTime": "45ms"
    },
    "pluginInfo": {
        "routes": ["GET /status", "GET /data", "POST /read"],
        "memoryUsage": "12.5MB",
        "cpuUsage": "2.3%"
    }
}
```

### Plugin Management via Status Endpoint

You can also perform management operations through the status endpoint:

**Disable Plugin:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"action": "disable"}' \
     http://localhost:4000/api/plugins/26/status
```

**Enable Plugin:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"action": "enable"}' \
     http://localhost:4000/api/plugins/26/status
```

**Reload Plugin:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"action": "reload"}' \
     http://localhost:4000/api/plugins/26/status
```

**Uninstall Plugin:**
```bash
curl -X POST \
     -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"action": "uninstall"}' \
     http://localhost:4000/api/plugins/26/status
```

### Plugin Feedback Integration

Plugins can provide custom feedback through the status endpoint:

**Custom Plugin Status Response:**
```json
{
    "status": "healthy",
    "pluginFeedback": {
        "message": "Plugin is monitoring 5 clusters",
        "warnings": ["High memory usage detected"],
        "errors": [],
        "data": {
            "activeConnections": 12,
            "monitoredResources": 150,
            "lastBackup": "2025-08-15T14:30:00Z"
        }
    }
}
```

## Support

For issues with plugin development or installation:

1. Check the system logs for detailed error messages
2. Verify your plugin structure matches the requirements
3. Test with the provided example plugins
4. Contact the development team for assistance
