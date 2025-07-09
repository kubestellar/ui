package plugins

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// PluginLoader handles plugin loading, validation, and integrity checking
type PluginLoader struct {
	pluginsDirectory string
	allowedOrigins   []string
	maxPluginSize    int64 // in bytes
}

// PluginValidationResult contains the result of plugin validation
type PluginValidationResult struct {
	Valid    bool     `json:"valid"`
	Errors   []string `json:"errors,omitempty"`
	Warnings []string `json:"warnings,omitempty"`
	Checksum string   `json:"checksum,omitempty"`
	Size     int64    `json:"size,omitempty"`
}

// NewPluginLoader creates a new plugin loader
func NewPluginLoader(pluginsDirectory string) *PluginLoader {
	return &PluginLoader{
		pluginsDirectory: pluginsDirectory,
		allowedOrigins:   []string{"local", "github", "artifacthub"},
		maxPluginSize:    50 * 1024 * 1024, // 50MB
	}
}

// LoadPluginFromPath loads a plugin from a specific path
func (pl *PluginLoader) LoadPluginFromPath(pluginPath string) (*Plugin, error) {
	// Validate the plugin path
	if err := pl.validatePluginPath(pluginPath); err != nil {
		return nil, fmt.Errorf("invalid plugin path: %v", err)
	}

	// Load and validate the manifest
	manifest, err := pl.loadManifest(pluginPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load manifest: %v", err)
	}

	// Validate the manifest
	validationResult := pl.validateManifest(manifest)
	if !validationResult.Valid {
		return nil, fmt.Errorf("manifest validation failed: %v", validationResult.Errors)
	}

	// Load and validate the WASM file
	wasmPath := filepath.Join(pluginPath, manifest.Name+".wasm")
	_, err = pl.loadWasmFile(wasmPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load WASM file: %v", err)
	}

	// Create plugin instance
	plugin := &Plugin{
		Manifest: manifest,
		Status:   "Loaded",
		LoadTime: time.Now(),
	}

	return plugin, nil
}

// LoadPluginFromArchive loads a plugin from a compressed archive
func (pl *PluginLoader) LoadPluginFromArchive(archivePath string) (*Plugin, error) {
	// Extract the archive to a temporary directory
	tempDir, err := pl.extractArchive(archivePath)
	if err != nil {
		return nil, fmt.Errorf("failed to extract archive: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Load the plugin from the extracted directory
	return pl.LoadPluginFromPath(tempDir)
}

// ValidatePlugin validates a plugin without loading it
func (pl *PluginLoader) ValidatePlugin(pluginPath string) (*PluginValidationResult, error) {
	result := &PluginValidationResult{
		Valid: true,
	}

	// Check if path exists
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		result.Valid = false
		result.Errors = append(result.Errors, "Plugin path does not exist")
		return result, nil
	}

	// Load and validate manifest
	manifest, err := pl.loadManifest(pluginPath)
	if err != nil {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("Manifest error: %v", err))
		return result, nil
	}

	// Validate manifest structure
	manifestValidation := pl.validateManifest(manifest)
	if !manifestValidation.Valid {
		result.Valid = false
		result.Errors = append(result.Errors, manifestValidation.Errors...)
	}

	// Check WASM file
	wasmPath := filepath.Join(pluginPath, manifest.Name+".wasm")
	if _, err := os.Stat(wasmPath); os.IsNotExist(err) {
		result.Valid = false
		result.Errors = append(result.Errors, "WASM file not found")
	} else {
		// Validate WASM file
		wasmValidation := pl.validateWasmFile(wasmPath)
		if !wasmValidation.Valid {
			result.Valid = false
			result.Errors = append(result.Errors, wasmValidation.Errors...)
		}
		result.Checksum = wasmValidation.Checksum
		result.Size = wasmValidation.Size
	}

	return result, nil
}

// loadManifest loads and parses the plugin manifest
func (pl *PluginLoader) loadManifest(pluginPath string) (*PluginManifest, error) {
	manifestPath := filepath.Join(pluginPath, "plugin.yml")

	// Check if manifest exists
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("manifest file not found: %s", manifestPath)
	}

	// Read manifest file
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest: %v", err)
	}

	// Parse YAML
	var manifest PluginManifest
	if err := yaml.Unmarshal(manifestData, &manifest); err != nil {
		return nil, fmt.Errorf("failed to parse manifest YAML: %v", err)
	}

	return &manifest, nil
}

// loadWasmFile loads the WASM file
func (pl *PluginLoader) loadWasmFile(wasmPath string) ([]byte, error) {
	// Check if WASM file exists
	if _, err := os.Stat(wasmPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("WASM file not found: %s", wasmPath)
	}

	// Read WASM file
	wasmData, err := os.ReadFile(wasmPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read WASM file: %v", err)
	}

	// Check file size
	if int64(len(wasmData)) > pl.maxPluginSize {
		return nil, fmt.Errorf("WASM file too large: %d bytes (max: %d)", len(wasmData), pl.maxPluginSize)
	}

	return wasmData, nil
}

// validatePluginPath validates the plugin directory path
func (pl *PluginLoader) validatePluginPath(pluginPath string) error {
	// Check if path exists and is a directory
	info, err := os.Stat(pluginPath)
	if err != nil {
		return fmt.Errorf("plugin path does not exist: %v", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("plugin path is not a directory")
	}

	// Check if path is within the plugins directory
	absPluginPath, err := filepath.Abs(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to get absolute path: %v", err)
	}

	absPluginsDir, err := filepath.Abs(pl.pluginsDirectory)
	if err != nil {
		return fmt.Errorf("failed to get absolute plugins directory: %v", err)
	}

	if !strings.HasPrefix(absPluginPath, absPluginsDir) {
		return fmt.Errorf("plugin path is outside plugins directory")
	}

	return nil
}

// validateManifest validates the plugin manifest
func (pl *PluginLoader) validateManifest(manifest *PluginManifest) *PluginValidationResult {
	result := &PluginValidationResult{
		Valid: true,
	}

	// Check required fields
	if manifest.Name == "" {
		result.Valid = false
		result.Errors = append(result.Errors, "Plugin name is required")
	}

	if manifest.Version == "" {
		result.Valid = false
		result.Errors = append(result.Errors, "Plugin version is required")
	}

	// Validate plugin name format
	if !pl.isValidPluginName(manifest.Name) {
		result.Valid = false
		result.Errors = append(result.Errors, "Invalid plugin name format")
	}

	// Validate version format
	if !pl.isValidVersion(manifest.Version) {
		result.Valid = false
		result.Errors = append(result.Errors, "Invalid version format")
	}

	// Check for duplicate routes
	routeMap := make(map[string]bool)
	for _, route := range manifest.Routes {
		routeKey := fmt.Sprintf("%s:%s", route.Method, route.Path)
		if routeMap[routeKey] {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Duplicate route: %s %s", route.Method, route.Path))
		}
		routeMap[routeKey] = true
	}

	return result
}

// validateWasmFile validates the WASM file
func (pl *PluginLoader) validateWasmFile(wasmPath string) *PluginValidationResult {
	result := &PluginValidationResult{
		Valid: true,
	}

	// Get file info
	info, err := os.Stat(wasmPath)
	if err != nil {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to stat WASM file: %v", err))
		return result
	}

	result.Size = info.Size()

	// Check file size
	if info.Size() > pl.maxPluginSize {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("WASM file too large: %d bytes (max: %d)", info.Size(), pl.maxPluginSize))
	}

	// Calculate checksum
	checksum, err := pl.calculateChecksum(wasmPath)
	if err != nil {
		result.Valid = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to calculate checksum: %v", err))
	} else {
		result.Checksum = checksum
	}

	// Check WASM magic number
	if !pl.isValidWasmFile(wasmPath) {
		result.Valid = false
		result.Errors = append(result.Errors, "Invalid WASM file format")
	}

	return result
}

// calculateChecksum calculates SHA256 checksum of a file
func (pl *PluginLoader) calculateChecksum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// isValidWasmFile checks if a file is a valid WASM file
func (pl *PluginLoader) isValidWasmFile(filePath string) bool {
	file, err := os.Open(filePath)
	if err != nil {
		return false
	}
	defer file.Close()

	// Read WASM magic number
	magic := make([]byte, 4)
	if _, err := file.Read(magic); err != nil {
		return false
	}

	// WASM magic number: \0asm
	return magic[0] == 0x00 && magic[1] == 0x61 && magic[2] == 0x73 && magic[3] == 0x6d
}

// isValidPluginName validates plugin name format
func (pl *PluginLoader) isValidPluginName(name string) bool {
	if len(name) == 0 || len(name) > 50 {
		return false
	}

	// Only allow lowercase letters, numbers, and hyphens
	for _, char := range name {
		if !((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '-') {
			return false
		}
	}

	// Must start with a letter
	if name[0] < 'a' || name[0] > 'z' {
		return false
	}

	return true
}

// isValidVersion validates version format
func (pl *PluginLoader) isValidVersion(version string) bool {
	if len(version) == 0 || len(version) > 20 {
		return false
	}

	// Simple version validation - allow alphanumeric, dots, and hyphens
	for _, char := range version {
		if !((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') || char == '.' || char == '-') {
			return false
		}
	}

	return true
}

// extractArchive extracts a compressed archive (placeholder implementation)
func (pl *PluginLoader) extractArchive(archivePath string) (string, error) {
	// This is a placeholder - in a real implementation, you would:
	// 1. Detect archive type (tar.gz, zip, etc.)
	// 2. Extract to temporary directory
	// 3. Return the path to the extracted directory

	// For now, just return the archive path as-is
	return archivePath, nil
}
