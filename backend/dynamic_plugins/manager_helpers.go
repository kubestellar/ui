package dynamic_plugins

import (
	"crypto/sha256"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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

	// Modify the module name for the plugin to avoid conflicts
	modifiedContent := strings.Replace(string(content), "module github.com/kubestellar/ui", "module kubestellar-plugin", 1)

	// Get the current backend directory for the replace directive
	backendDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Add required dependency and replace directives
	modifiedContent += "\n// Plugin build requirements and replacements\n"
	modifiedContent += "require github.com/kubestellar/ui v0.0.0\n"

	// Point github.com/kubestellar/ui to the actual backend directory
	modifiedContent += fmt.Sprintf("replace github.com/kubestellar/ui => %s\n", backendDir)

	// Add replace directives for copied backend packages only (not dynamic_plugins since we want original)
	modifiedContent += "replace kubestellar-plugin/backend_api => ./backend_api\n"
	modifiedContent += "replace kubestellar-plugin/backend_installer => ./backend_installer\n"
	modifiedContent += "replace kubestellar-plugin/backend_k8s => ./backend_k8s\n"
	modifiedContent += "replace kubestellar-plugin/backend_models => ./backend_models\n"
	modifiedContent += "replace kubestellar-plugin/backend_redis => ./backend_redis\n"
	modifiedContent += "replace kubestellar-plugin/backend_services => ./backend_services\n"
	modifiedContent += "replace kubestellar-plugin/backend_utils => ./backend_utils\n"
	modifiedContent += "replace kubestellar-plugin/backend_wds => ./backend_wds\n"
	modifiedContent += "replace kubestellar-plugin/backend_jwt => ./backend_jwt\n"
	modifiedContent += "replace kubestellar-plugin/backend_middleware => ./backend_middleware\n"
	modifiedContent += "replace kubestellar-plugin/backend_namespace => ./backend_namespace\n"
	modifiedContent += "replace kubestellar-plugin/backend_postgresql => ./backend_postgresql\n"
	modifiedContent += "replace kubestellar-plugin/backend_its => ./backend_its\n"
	modifiedContent += "replace kubestellar-plugin/backend_log => ./backend_log\n"
	modifiedContent += "replace kubestellar-plugin/backend_plugin => ./backend_plugin\n"
	modifiedContent += "replace kubestellar-plugin/backend_routes => ./backend_routes\n"
	modifiedContent += "replace kubestellar-plugin/backend_wecs => ./backend_wecs\n"

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

// setupLocalPackages copies required local packages to plugin build directory
func (epm *EnhancedPluginManager) setupLocalPackages(tempDir string) error {
	backendDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// List of packages that plugins might need - with backend_ prefix to avoid conflicts
	// Note: dynamic_plugins is excluded since plugins should use the original package
	requiredPackages := map[string]string{
		"api":        "backend_api",
		"installer":  "backend_installer",
		"k8s":        "backend_k8s",
		"models":     "backend_models",
		"redis":      "backend_redis",
		"services":   "backend_services",
		"utils":      "backend_utils",
		"wds":        "backend_wds",
		"jwt":        "backend_jwt",
		"middleware": "backend_middleware",
		"namespace":  "backend_namespace",
		"postgresql": "backend_postgresql",
		"its":        "backend_its",
		"log":        "backend_log",
		"plugin":     "backend_plugin",
		"routes":     "backend_routes",
		"wecs":       "backend_wecs",
	}

	// Create and copy each required package directory
	for srcName, dstName := range requiredPackages {
		packageDir := filepath.Join(tempDir, dstName)
		if err := os.MkdirAll(packageDir, 0755); err != nil {
			return fmt.Errorf("failed to create %s directory: %w", dstName, err)
		}

		// Copy package files
		packageSrcDir := filepath.Join(backendDir, srcName)
		if _, err := os.Stat(packageSrcDir); os.IsNotExist(err) {
			// Skip if package doesn't exist
			continue
		}

		if err := epm.copyDirectory(packageSrcDir, packageDir); err != nil {
			return fmt.Errorf("failed to copy %s package: %w", srcName, err)
		}
	}

	return nil
}

// copyDirectory recursively copies a directory
func (epm *EnhancedPluginManager) copyDirectory(src, dst string) error {
	// List of packages to replace (excluding dynamic_plugins which should use original)
	packageReplacements := map[string]string{
		`"github.com/kubestellar/ui/api"`:        `"kubestellar-plugin/backend_api"`,
		`"github.com/kubestellar/ui/installer"`:  `"kubestellar-plugin/backend_installer"`,
		`"github.com/kubestellar/ui/k8s"`:        `"kubestellar-plugin/backend_k8s"`,
		`"github.com/kubestellar/ui/models"`:     `"kubestellar-plugin/backend_models"`,
		`"github.com/kubestellar/ui/redis"`:      `redis "kubestellar-plugin/backend_redis"`,
		`"github.com/kubestellar/ui/services"`:   `"kubestellar-plugin/backend_services"`,
		`"github.com/kubestellar/ui/utils"`:      `"kubestellar-plugin/backend_utils"`,
		`"github.com/kubestellar/ui/wds/bp"`:     `"kubestellar-plugin/backend_wds/bp"`,
		`"github.com/kubestellar/ui/wds"`:        `"kubestellar-plugin/backend_wds"`,
		`"github.com/kubestellar/ui/jwt"`:        `"kubestellar-plugin/backend_jwt"`,
		`"github.com/kubestellar/ui/middleware"`: `"kubestellar-plugin/backend_middleware"`,
		`"github.com/kubestellar/ui/namespace"`:  `"kubestellar-plugin/backend_namespace"`,
		`"github.com/kubestellar/ui/postgresql"`: `"kubestellar-plugin/backend_postgresql"`,
		`"github.com/kubestellar/ui/its"`:        `"kubestellar-plugin/backend_its"`,
		`"github.com/kubestellar/ui/log"`:        `log "kubestellar-plugin/backend_log"`,
		`"github.com/kubestellar/ui/plugin"`:     `"kubestellar-plugin/backend_plugin"`,
		`"github.com/kubestellar/ui/routes"`:     `"kubestellar-plugin/backend_routes"`,
		`"github.com/kubestellar/ui/wecs"`:       `"kubestellar-plugin/backend_wecs"`,
	}

	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip certain files/directories
		if strings.Contains(path, ".git") || strings.Contains(path, "build_cache") {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		// Copy only .go files and certain other files
		if !strings.HasSuffix(path, ".go") && !strings.HasSuffix(path, ".yaml") {
			return nil
		}

		// For .go files, copy and modify imports
		if strings.HasSuffix(path, ".go") {
			content, err := os.ReadFile(path)
			if err != nil {
				return fmt.Errorf("failed to read %s: %w", path, err)
			}

			modifiedContent := string(content)

			// Apply all import replacements
			for oldImport, newImport := range packageReplacements {
				modifiedContent = strings.Replace(modifiedContent, oldImport, newImport, -1)
			}

			// Also replace package prefixes in code (excluding dynamic_plugins which should use original)
			packagePrefixReplacements := map[string]string{
				`\bapi\.`:        `backend_api.`,
				`\binstaller\.`:  `backend_installer.`,
				`\bmodels\.`:     `backend_models.`,
				`\bservices\.`:   `backend_services.`,
				`\butils\.`:      `backend_utils.`,
				`\bwds\.`:        `backend_wds.`,
				`\bjwt\.`:        `backend_jwt.`,
				`\bmiddleware\.`: `backend_middleware.`,
				`\bnamespace\.`:  `backend_namespace.`,
				`\bpostgresql\.`: `backend_postgresql.`,
				`\bits\.`:        `backend_its.`,
				`\broutes\.`:     `backend_routes.`,
				`\bwecs\.`:       `backend_wecs.`,
			}

			for oldPattern, newPrefix := range packagePrefixReplacements {
				re := regexp.MustCompile(oldPattern)
				modifiedContent = re.ReplaceAllString(modifiedContent, newPrefix)
			}

			if err := os.WriteFile(dstPath, []byte(modifiedContent), info.Mode()); err != nil {
				return fmt.Errorf("failed to write modified %s: %w", dstPath, err)
			}
		} else {
			// For non-.go files, just copy
			return epm.copyFile(path, dstPath)
		}

		return nil
	})
}

// modifyPluginImports modifies all Go files in the plugin to use relative imports
func (epm *EnhancedPluginManager) modifyPluginImports(tempDir string) error {
	// List of packages to replace (excluding dynamic_plugins which should use original)
	packageReplacements := map[string]string{
		`"github.com/kubestellar/ui/api"`:        `"kubestellar-plugin/backend_api"`,
		`"github.com/kubestellar/ui/installer"`:  `"kubestellar-plugin/backend_installer"`,
		`"github.com/kubestellar/ui/k8s"`:        `"kubestellar-plugin/backend_k8s"`,
		`"github.com/kubestellar/ui/models"`:     `"kubestellar-plugin/backend_models"`,
		`"github.com/kubestellar/ui/redis"`:      `redis "kubestellar-plugin/backend_redis"`,
		`"github.com/kubestellar/ui/services"`:   `"kubestellar-plugin/backend_services"`,
		`"github.com/kubestellar/ui/utils"`:      `"kubestellar-plugin/backend_utils"`,
		`"github.com/kubestellar/ui/wds/bp"`:     `"kubestellar-plugin/backend_wds/bp"`,
		`"github.com/kubestellar/ui/wds"`:        `"kubestellar-plugin/backend_wds"`,
		`"github.com/kubestellar/ui/jwt"`:        `"kubestellar-plugin/backend_jwt"`,
		`"github.com/kubestellar/ui/middleware"`: `"kubestellar-plugin/backend_middleware"`,
		`"github.com/kubestellar/ui/namespace"`:  `"kubestellar-plugin/backend_namespace"`,
		`"github.com/kubestellar/ui/postgresql"`: `"kubestellar-plugin/backend_postgresql"`,
		`"github.com/kubestellar/ui/its"`:        `"kubestellar-plugin/backend_its"`,
		`"github.com/kubestellar/ui/log"`:        `log "kubestellar-plugin/backend_log"`,
		`"github.com/kubestellar/ui/plugin"`:     `"kubestellar-plugin/backend_plugin"`,
		`"github.com/kubestellar/ui/routes"`:     `"kubestellar-plugin/backend_routes"`,
		`"github.com/kubestellar/ui/wecs"`:       `"kubestellar-plugin/backend_wecs"`,
	}

	// Function to modify imports in a single Go file
	modifyGoFile := func(filePath string) error {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read %s: %w", filePath, err)
		}

		modifiedContent := string(content)

		// Apply all import replacements
		for oldImport, newImport := range packageReplacements {
			modifiedContent = strings.Replace(modifiedContent, oldImport, newImport, -1)
		}

		// Also replace package prefixes in code (excluding dynamic_plugins which should use original)
		packagePrefixReplacements := map[string]string{
			`\bapi\.`:        `backend_api.`,
			`\binstaller\.`:  `backend_installer.`,
			`\bmodels\.`:     `backend_models.`,
			`\bservices\.`:   `backend_services.`,
			`\butils\.`:      `backend_utils.`,
			`\bwds\.`:        `backend_wds.`,
			`\bjwt\.`:        `backend_jwt.`,
			`\bmiddleware\.`: `backend_middleware.`,
			`\bnamespace\.`:  `backend_namespace.`,
			`\bpostgresql\.`: `backend_postgresql.`,
			`\bits\.`:        `backend_its.`,
			`\broutes\.`:     `backend_routes.`,
			`\bwecs\.`:       `backend_wecs.`,
		}

		for oldPattern, newPrefix := range packagePrefixReplacements {
			re := regexp.MustCompile(oldPattern)
			modifiedContent = re.ReplaceAllString(modifiedContent, newPrefix)
		}

		if err := os.WriteFile(filePath, []byte(modifiedContent), 0644); err != nil {
			return fmt.Errorf("failed to write modified %s: %w", filePath, err)
		}

		return nil
	}

	// Walk through all Go files and modify imports
	return filepath.Walk(tempDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Only process .go files
		if !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Skip directories we copied from backend (they should already have correct imports)
		for _, pkg := range []string{"backend_api", "backend_installer", "backend_k8s", "backend_models", "backend_redis", "backend_services", "backend_utils", "backend_wds", "backend_jwt", "backend_middleware", "backend_namespace", "backend_postgresql", "backend_its", "backend_log", "backend_plugin", "backend_routes", "backend_wecs"} {
			if strings.Contains(path, "/"+pkg+"/") {
				return nil
			}
		}

		// Skip main plugin files (main.go, plugin.go, etc.) that should keep original imports
		fileName := filepath.Base(path)
		if fileName == "main.go" || fileName == "plugin.go" || strings.HasPrefix(fileName, "plugin_") {
			return nil
		}

		return modifyGoFile(path)
	})
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
