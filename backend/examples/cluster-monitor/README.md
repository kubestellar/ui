# Cluster Monitor Plugin

This is an example plugin for the KubeStellar Dynamic WASM Plugin system. It demonstrates how to create a simple cluster monitoring plugin that can be loaded dynamically by the KubeStellar UI.

## Features

- Cluster status monitoring
- Cluster data retrieval
- RESTful API endpoints
- WASM-based execution

## Plugin Structure

```
cluster-monitor/
├── main.go          # Plugin source code
├── plugin.yml       # Plugin manifest
├── Makefile         # Build configuration
└── README.md        # This file
```

## Building the Plugin

### Prerequisites

1. **TinyGo**: Install TinyGo for WASM compilation
   ```bash
   # macOS
   brew install tinygo
   
   # Linux
   wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_amd64.deb
   sudo dpkg -i tinygo_0.30.0_amd64.deb
   ```

2. **Go**: Ensure you have Go 1.21+ installed

### Build Commands

```bash
# Build the WASM plugin
make build

# Package for distribution
make package

# Install to plugins directory
make install

# Clean build artifacts
make clean

# Show plugin information
make info
```

## Plugin Manifest

The `plugin.yml` file defines the plugin's configuration:

```yaml
apiVersion: kubestellar.io/v1
kind: Plugin
metadata:
  name: "cluster-monitor"
  version: "1.0.0"
  author: "developer@company.com"
  description: "Simple cluster monitoring dashboard"
spec:
  backend:
    enabled: true
    routes:
      - path: "/status"
        methods: ["GET"]
        handler: "handle_status"
      - path: "/data"
        methods: ["GET", "POST"]
        handler: "handle_data"
  permissions:
    - "kubestellar:read:clusters"
    - "kubestellar:read:workloads"
```

## API Endpoints

### GET /api/plugins/cluster-monitor/status

Returns the plugin status and basic information.

**Response:**
```json
{
  "status": "success",
  "message": "Cluster monitor plugin is running",
  "data": {
    "plugin": "cluster-monitor",
    "version": "1.0.0",
    "status": "active"
  }
}
```

### GET /api/plugins/cluster-monitor/data

Returns simulated cluster data.

**Response:**
```json
{
  "status": "success",
  "message": "Cluster data retrieved successfully",
  "data": {
    "clusters": [
      {
        "id": "cluster-1",
        "name": "Production Cluster",
        "status": "healthy",
        "nodes": 5,
        "pods": 150
      },
      {
        "id": "cluster-2",
        "name": "Staging Cluster",
        "status": "warning",
        "nodes": 3,
        "pods": 75
      }
    ],
    "total_clusters": 2,
    "healthy_clusters": 1,
    "warning_clusters": 1
  }
}
```

## Development

### Adding New Functions

1. Add the function to `main.go`:
   ```go
   //export handle_new_function
   func handle_new_function(dataPtr, dataLen uint32) uint64 {
       // Your function implementation
       return writeResponse(response)
   }
   ```

2. Add the route to `plugin.yml`:
   ```yaml
   routes:
     - path: "/new-endpoint"
       methods: ["GET"]
       handler: "handle_new_function"
   ```

### Host Functions

The plugin can call these host functions:

- `host_k8s_api_call`: Make Kubernetes API calls
- `host_log`: Log messages
- `host_get_config`: Get plugin configuration
- `host_storage_get/set`: Basic storage operations

### Memory Management

The plugin uses a simple memory management approach:

- `allocate(size uint32) uint32`: Allocates memory (exported function)
- `readMemory(ptr, len uint32) []byte`: Reads from WASM memory
- `writeResponse(response) uint64`: Writes response and returns pointer/length

## Testing

### Manual Testing

1. Build and install the plugin:
   ```bash
   make install
   ```

2. Start the KubeStellar backend server

3. Test the endpoints:
   ```bash
   curl http://localhost:4000/api/plugins/cluster-monitor/status
   curl http://localhost:4000/api/plugins/cluster-monitor/data
   ```

### Integration Testing

The plugin will be automatically discovered and loaded by the plugin registry when placed in the plugins directory.

## Troubleshooting

### Common Issues

1. **TinyGo not found**: Ensure TinyGo is installed and in your PATH
2. **WASM compilation errors**: Check that all imports are compatible with WASM
3. **Plugin not loading**: Verify the manifest format and file structure
4. **Function not found**: Ensure exported functions match the manifest handlers

### Debugging

1. Check the backend logs for plugin loading errors
2. Verify the WASM file is valid: `file cluster-monitor.wasm`
3. Test the plugin manifest: `yamllint plugin.yml`

## Next Steps

This is a basic example plugin. For production use, consider:

1. **Error Handling**: Add comprehensive error handling
2. **Configuration**: Implement dynamic configuration loading
3. **Security**: Add input validation and sanitization
4. **Performance**: Optimize memory usage and function calls
5. **Testing**: Add unit tests and integration tests
6. **Documentation**: Add API documentation and examples 