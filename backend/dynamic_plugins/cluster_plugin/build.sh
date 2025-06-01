#!/bin/bash

# Build script for KubeStellar Cluster Management Plugin

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PLUGIN_NAME="kubestellar-cluster-manager"
OUTPUT_DIR="$SCRIPT_DIR/../cache"
BACKEND_DIR="$SCRIPT_DIR/../.."

echo "🔨 Building KubeStellar Cluster Management Plugin..."

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Navigate to plugin directory
cd "$SCRIPT_DIR"

# Create a temporary go.mod for the plugin
echo "📝 Setting up plugin module..."
cat > go.mod << EOF
module kubestellar-cluster-plugin

go 1.19

replace github.com/kubestellar/ui => $BACKEND_DIR

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/kubestellar/ui v0.0.0-00010101000000-000000000000
	k8s.io/api v0.28.3
	k8s.io/apimachinery v0.28.3
	k8s.io/client-go v0.28.3
)
EOF

# Copy go.sum from backend if it exists
if [ -f "$BACKEND_DIR/go.sum" ]; then
	cp "$BACKEND_DIR/go.sum" ./go.sum
fi

# Download dependencies
echo "📦 Downloading dependencies..."
go mod download

# Build the plugin as a shared library
echo "🔧 Compiling plugin to shared library..."
CGO_ENABLED=1 go build -buildmode=plugin -ldflags="-w -s" -o "$OUTPUT_DIR/${PLUGIN_NAME}.so" main.go

# Clean up temporary files
rm -f go.mod go.sum

echo "✅ Plugin built successfully: $OUTPUT_DIR/${PLUGIN_NAME}.so"
echo "📄 Plugin manifest: $SCRIPT_DIR/plugin.yaml"

# Validate the plugin build
if [ -f "$OUTPUT_DIR/${PLUGIN_NAME}.so" ]; then
	echo "🎉 Build completed successfully!"
	echo ""
	echo "To load this plugin, use:"
	echo "  curl -X POST http://localhost:4000/api/plugins/load \\"
	echo "    -H 'Content-Type: application/json' \\"
	echo "    -d '{\"source\":\"$OUTPUT_DIR/${PLUGIN_NAME}.so\"}'"
else
	echo "❌ Build failed - plugin file not found"
	exit 1
fi 