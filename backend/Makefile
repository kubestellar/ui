.PHONY: dev build clean build-plugin build-all

# Development server with hot reload
dev:
    air

# Build the main backend application
build:
    go build -o ./bin/main ./main.go

# Build the cluster plugin
build-plugin:
    @echo "Building cluster plugin..."
    cd example_plugins/cluster-plugin && go build -buildmode=plugin -o kubestellar-cluster-plugin.so .
    @echo "Plugin built: example_plugins/cluster-plugin/kubestellar-cluster-plugin.so"

# Build both backend and plugin
build-all: build build-plugin
    @echo "Backend and plugin built successfully!"

# Copy plugin to dynamic_plugins directory for auto-install testing
prepare-plugin: build-plugin
    @echo "Preparing plugin for auto-install..."
    @mkdir -p ./dynamic_plugins/cache
    @cp example_plugins/cluster-plugin/kubestellar-cluster-plugin.so ./dynamic_plugins/cache/
    @echo "Plugin copied to dynamic_plugins/cache/"

# Clean build artifacts
clean:
    rm -rf bin
    rm -f example_plugins/cluster-plugin/*.so
    rm -rf dynamic_plugins/cache/*
    @echo "Clean completed."

# Test the plugin build
test-plugin: build-plugin
    @echo "Testing plugin build..."
    @if [ -f example_plugins/cluster-plugin/kubestellar-cluster-plugin.so ]; then \
        echo "✅ Plugin built successfully"; \
        file example_plugins/cluster-plugin/kubestellar-cluster-plugin.so; \
    else \
        echo "❌ Plugin build failed"; \
        exit 1; \
    fi