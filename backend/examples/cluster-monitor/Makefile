# Makefile for cluster-monitor plugin

# Plugin configuration
PLUGIN_NAME = cluster-monitor
PLUGIN_VERSION = 1.0.0

# Build configuration
TINYGO_VERSION = 0.30.0
GO_VERSION = 1.21

# Directories
BUILD_DIR = build
DIST_DIR = dist

# Files
WASM_FILE = $(BUILD_DIR)/$(PLUGIN_NAME).wasm
MANIFEST_FILE = plugin.yml
PACKAGE_FILE = $(DIST_DIR)/$(PLUGIN_NAME)-$(PLUGIN_VERSION).tar.gz

# Default target
.PHONY: all
all: build package

# Build the WASM plugin
.PHONY: build
build: $(WASM_FILE)

$(WASM_FILE): main.go
	@echo "Building $(PLUGIN_NAME) plugin..."
	@mkdir -p $(BUILD_DIR)
	tinygo build -o $(WASM_FILE) -target wasm --no-debug main.go
	@echo "Plugin built successfully: $(WASM_FILE)"

# Package the plugin
.PHONY: package
package: $(PACKAGE_FILE)

$(PACKAGE_FILE): $(WASM_FILE) $(MANIFEST_FILE)
	@echo "Packaging $(PLUGIN_NAME) plugin..."
	@mkdir -p $(DIST_DIR)
	@mkdir -p $(BUILD_DIR)/$(PLUGIN_NAME)
	@cp $(WASM_FILE) $(BUILD_DIR)/$(PLUGIN_NAME)/
	@cp $(MANIFEST_FILE) $(BUILD_DIR)/$(PLUGIN_NAME)/
	@cd $(BUILD_DIR) && tar -czf ../$(PACKAGE_FILE) $(PLUGIN_NAME)/
	@echo "Plugin packaged: $(PACKAGE_FILE)"

# Install the plugin
.PHONY: install
install: build
	@echo "Installing $(PLUGIN_NAME) plugin..."
	@mkdir -p ../../plugins/$(PLUGIN_NAME)
	@cp $(WASM_FILE) ../../plugins/$(PLUGIN_NAME)/
	@cp $(MANIFEST_FILE) ../../plugins/$(PLUGIN_NAME)/
	@echo "Plugin installed to ../../plugins/$(PLUGIN_NAME)/"

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(DIST_DIR)
	@echo "Clean complete"

# Validate the plugin
.PHONY: validate
validate: $(MANIFEST_FILE)
	@echo "Validating plugin manifest..."
	@if ! command -v yamllint >/dev/null 2>&1; then \
		echo "yamllint not found, skipping YAML validation"; \
	else \
		yamllint $(MANIFEST_FILE); \
	fi
	@echo "Validation complete"

# Show plugin information
.PHONY: info
info:
	@echo "Plugin: $(PLUGIN_NAME)"
	@echo "Version: $(PLUGIN_VERSION)"
	@echo "TinyGo Version: $(TINYGO_VERSION)"
	@echo "Go Version: $(GO_VERSION)"
	@echo "Build Directory: $(BUILD_DIR)"
	@echo "Distribution Directory: $(DIST_DIR)"

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build     - Build the WASM plugin"
	@echo "  package   - Package the plugin for distribution"
	@echo "  install   - Install the plugin to the plugins directory"
	@echo "  clean     - Clean build artifacts"
	@echo "  validate  - Validate the plugin manifest"
	@echo "  info      - Show plugin information"
	@echo "  help      - Show this help message" 