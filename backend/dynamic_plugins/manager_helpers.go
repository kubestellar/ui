package dynamic_plugins

import (
	"crypto/sha256"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Helper methods for EnhancedPluginManager

// validateLocalFiles validates that local plugin and manifest files exist and are readable
func (epm *EnhancedPluginManager) validateLocalFiles(pluginPath, manifestPath string) error {
	// Check plugin file
	if _, err := os.Stat(pluginPath); os.IsNotExist(err) {
		return fmt.Errorf("plugin file does not exist: %s", pluginPath)
	}

	// Check manifest file
	if _, err := os.Stat(manifestPath); os.IsNotExist(err) {
		return fmt.Errorf("manifest file does not exist: %s", manifestPath)
	}

	// Check file permissions
	if err := epm.checkFilePermissions(pluginPath); err != nil {
		return fmt.Errorf("plugin file permission check failed: %w", err)
	}

	if err := epm.checkFilePermissions(manifestPath); err != nil {
		return fmt.Errorf("manifest file permission check failed: %w", err)
	}

	return nil
}

// checkFilePermissions verifies that a file is readable
func (epm *EnhancedPluginManager) checkFilePermissions(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("cannot open file: %w", err)
	}
	defer file.Close()

	// Try to read a small amount to verify readability
	buffer := make([]byte, 1)
	_, err = file.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("cannot read file: %w", err)
	}

	return nil
}

// validatePluginSecurity performs security validation on a plugin
func (epm *EnhancedPluginManager) validatePluginSecurity(pluginPath string, manifest PluginMetadata) error {
	// Check file size
	stat, err := os.Stat(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to get plugin file info: %w", err)
	}

	if stat.Size() > epm.maxPluginSize {
		return fmt.Errorf("plugin size %d exceeds maximum allowed size %d", stat.Size(), epm.maxPluginSize)
	}

	// Validate checksum if provided
	if manifest.Security.Checksum != "" {
		if err := epm.validatePluginChecksum(pluginPath, manifest.Security.Checksum); err != nil {
			return fmt.Errorf("checksum validation failed: %w", err)
		}
	}

	// Validate file extension
	if !strings.HasSuffix(pluginPath, ".so") {
		return fmt.Errorf("plugin file must have .so extension")
	}

	// Additional security checks based on configuration
	if epm.securityConfig.Sandboxed {
		if err := epm.validateSandboxCompatibility(manifest); err != nil {
			return fmt.Errorf("sandbox compatibility check failed: %w", err)
		}
	}

	return nil
}

// validatePluginChecksum validates the SHA256 checksum of a plugin file
func (epm *EnhancedPluginManager) validatePluginChecksum(pluginPath, expectedChecksum string) error {
	file, err := os.Open(pluginPath)
	if err != nil {
		return fmt.Errorf("failed to open plugin file: %w", err)
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	actualChecksum := fmt.Sprintf("%x", hasher.Sum(nil))
	if actualChecksum != expectedChecksum {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
	}

	return nil
}

// validateSandboxCompatibility checks if a plugin is compatible with sandbox mode
func (epm *EnhancedPluginManager) validateSandboxCompatibility(manifest PluginMetadata) error {
	// Check if plugin requires network access when sandboxed
	if !manifest.Security.NetworkAccess && epm.securityConfig.Sandboxed {
		// Validate that endpoints don't require external network calls
		for _, endpoint := range manifest.Endpoints {
			if endpoint.Description != "" && strings.Contains(strings.ToLower(endpoint.Description), "external") {
				return fmt.Errorf("endpoint %s appears to require external access but plugin is sandboxed", endpoint.Path)
			}
		}
	}

	// Check filesystem access requirements
	if !manifest.Security.FileSystemAccess && epm.securityConfig.Sandboxed {
		// Additional filesystem access checks could be added here
	}

	return nil
}

// generateCacheKey generates a cache key for build caching
func (epm *EnhancedPluginManager) generateCacheKey(tempDir string, manifest PluginMetadata) string {
	// Create a cache key based on plugin content and metadata
	hasher := sha256.New()

	// Add manifest ID and version
	hasher.Write([]byte(manifest.ID))
	hasher.Write([]byte(manifest.Version))

	// Add main.go content if available
	mainGoPath := filepath.Join(tempDir, "main.go")
	if mainGoFile, err := os.Open(mainGoPath); err == nil {
		io.Copy(hasher, mainGoFile)
		mainGoFile.Close()
	}

	return fmt.Sprintf("%x", hasher.Sum(nil))
}

// copyFile copies a file from src to dst
func (epm *EnhancedPluginManager) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, sourceFile); err != nil {
		return fmt.Errorf("failed to copy file: %w", err)
	}

	return nil
}

// copyAndModifyGoMod copies and modifies go.mod for plugin building
func (epm *EnhancedPluginManager) copyAndModifyGoMod(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("failed to open source go.mod: %w", err)
	}
	defer sourceFile.Close()

	content, err := io.ReadAll(sourceFile)
	if err != nil {
		return fmt.Errorf("failed to read go.mod: %w", err)
	}

	// Modify the module name for the plugin
	modifiedContent := strings.Replace(string(content), "module github.com/kubestellar/ui", "module plugin", 1)

	destFile, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("failed to create destination go.mod: %w", err)
	}
	defer destFile.Close()

	if _, err := destFile.WriteString(modifiedContent); err != nil {
		return fmt.Errorf("failed to write modified go.mod: %w", err)
	}

	return nil
}

// checkPluginHealth performs a health check for a specific plugin
func (epm *EnhancedPluginManager) checkPluginHealth(pluginID string) {
	if epm.healthChecker != nil {
		epm.healthChecker.AddPlugin(pluginID)
		go func() {
			// Wait a bit before performing first health check
			time.Sleep(5 * time.Second)
			if _, err := epm.healthChecker.CheckPluginHealth(pluginID); err != nil {
				pluginError := PluginError{
					Code:      ErrorCodeRuntime,
					Message:   "Initial health check failed",
					Details:   err.Error(),
					Timestamp: time.Now().Format(time.RFC3339),
				}
				epm.registry.AddError(pluginID, pluginError)
			}
		}()
	}
}

// startHealthChecker starts the health checking process
func (epm *EnhancedPluginManager) startHealthChecker() {
	if epm.healthChecker != nil {
		epm.healthChecker.SetRegistry(epm.registry)
		epm.healthChecker.Start()
	}
}

// emitEvent emits a plugin lifecycle event
func (epm *EnhancedPluginManager) emitEvent(event PluginEvent, pluginID string, data interface{}) {
	eventStr := string(event)
	if handlers, exists := epm.eventHandlers[eventStr]; exists {
		for _, handler := range handlers {
			go func(h func(string, interface{})) {
				defer func() {
					if r := recover(); r != nil {
						log.Printf("Event handler panic for event %s: %v", event, r)
					}
				}()
				h(pluginID, data)
			}(handler)
		}
	}
}

// addValidationMiddleware adds request validation middleware to a handler
func (epm *EnhancedPluginManager) addValidationMiddleware(handler gin.HandlerFunc, validation ValidationConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Validate content type if specified
		if len(validation.ContentType) > 0 {
			contentType := c.GetHeader("Content-Type")
			validContentType := false
			for _, ct := range validation.ContentType {
				if strings.Contains(contentType, ct) {
					validContentType = true
					break
				}
			}
			if !validContentType {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":    "Invalid content type",
					"expected": validation.ContentType,
				})
				return
			}
		}

		// Validate required fields if specified
		if len(validation.Required) > 0 {
			var requestData map[string]interface{}
			if err := c.ShouldBindJSON(&requestData); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Invalid JSON payload",
				})
				return
			}

			for _, field := range validation.Required {
				if _, exists := requestData[field]; !exists {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": fmt.Sprintf("Required field '%s' is missing", field),
					})
					return
				}
			}

			// Re-bind the data to the context for the handler
			c.Set("validatedData", requestData)
		}

		// Call the original handler
		handler(c)
	}
}

// addRateLimitMiddleware adds rate limiting middleware to a handler
func (epm *EnhancedPluginManager) addRateLimitMiddleware(handler gin.HandlerFunc, rateLimit RateLimitConfig) gin.HandlerFunc {
	// This is a simple in-memory rate limiter
	// In production, you'd want to use Redis or a more sophisticated solution
	requestCounts := make(map[string][]time.Time)

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now()

		// Clean old entries
		if times, exists := requestCounts[clientIP]; exists {
			var validTimes []time.Time
			windowStart := now.Add(-time.Duration(rateLimit.WindowSizeMs) * time.Millisecond)

			for _, t := range times {
				if t.After(windowStart) {
					validTimes = append(validTimes, t)
				}
			}
			requestCounts[clientIP] = validTimes
		}

		// Check rate limit
		if len(requestCounts[clientIP]) >= rateLimit.RPM {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": rateLimit.WindowSizeMs / 1000,
			})
			return
		}

		// Add current request
		requestCounts[clientIP] = append(requestCounts[clientIP], now)

		// Call the original handler
		handler(c)
	}
}

// CleanupResources performs cleanup when the manager is shutting down
func (epm *EnhancedPluginManager) CleanupResources() {
	// Stop health checker
	if epm.healthChecker != nil {
		epm.healthChecker.Stop()
	}

	// Unload all plugins
	plugins := epm.registry.ListDetailed()
	for pluginID := range plugins {
		if err := epm.UnloadPlugin(pluginID); err != nil {
			log.Printf("Error unloading plugin %s during cleanup: %v", pluginID, err)
		}
	}

	// Clean up build cache directory
	if epm.cacheDir != "" {
		os.RemoveAll(epm.cacheDir)
	}

	log.Printf("🧹 Plugin manager cleanup completed")
}

// GetBuildCache returns information about the build cache
func (epm *EnhancedPluginManager) GetBuildCache() map[string]interface{} {
	epm.mutex.RLock()
	defer epm.mutex.RUnlock()

	cacheInfo := map[string]interface{}{
		"cache_size": len(epm.buildCache),
		"cache_dir":  epm.cacheDir,
		"entries":    make(map[string]string),
	}

	entries := cacheInfo["entries"].(map[string]string)
	for key, timestamp := range epm.buildCache {
		entries[key] = timestamp.Format(time.RFC3339)
	}

	return cacheInfo
}

// ClearBuildCache clears the build cache
func (epm *EnhancedPluginManager) ClearBuildCache() error {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	// Clear in-memory cache
	epm.buildCache = make(map[string]time.Time)

	// Clear cache directory
	if err := os.RemoveAll(epm.cacheDir); err != nil {
		return fmt.Errorf("failed to clear cache directory: %w", err)
	}

	// Recreate cache directory
	if err := os.MkdirAll(epm.cacheDir, 0755); err != nil {
		return fmt.Errorf("failed to recreate cache directory: %w", err)
	}

	log.Printf("🧹 Build cache cleared successfully")
	return nil
}

// UpdateSecurityConfig updates the security configuration
func (epm *EnhancedPluginManager) UpdateSecurityConfig(config SecurityConfig) {
	epm.mutex.Lock()
	defer epm.mutex.Unlock()

	epm.securityConfig = config
	log.Printf("🔒 Security configuration updated")
}

// GetSecurityConfig returns the current security configuration
func (epm *EnhancedPluginManager) GetSecurityConfig() SecurityConfig {
	epm.mutex.RLock()
	defer epm.mutex.RUnlock()

	return epm.securityConfig
}
