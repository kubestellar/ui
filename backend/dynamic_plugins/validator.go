package dynamic_plugins

import (
	"fmt"
	"regexp"
	"strings"
)

// DefaultPluginValidator provides standard plugin validation
type DefaultPluginValidator struct {
	supportedMethods    []string
	supportedComponents []string
	maxEndpoints        int
	maxDependencies     int
	maxPermissions      int
	allowedPermissions  []string
}

// NewPluginValidator creates a new plugin validator with default settings
func NewPluginValidator() *DefaultPluginValidator {
	return &DefaultPluginValidator{
		supportedMethods:    []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		supportedComponents: []string{"React", "Vue", "Angular"},
		maxEndpoints:        50,
		maxDependencies:     20,
		maxPermissions:      30,
		allowedPermissions: []string{
			"cluster.read", "cluster.write", "cluster.delete",
			"configmap.read", "configmap.write", "configmap.delete",
			"secret.read", "secret.write", "secret.delete",
			"namespace.read", "namespace.write", "namespace.delete",
			"deployment.read", "deployment.write", "deployment.delete",
			"service.read", "service.write", "service.delete",
			"ingress.read", "ingress.write", "ingress.delete",
			"pod.read", "pod.write", "pod.delete",
			"node.read", "node.write", "node.delete",
			"admin.all", "system.metrics", "system.logs",
		},
	}
}

// ValidateMetadata validates the plugin metadata structure and values
func (dpv *DefaultPluginValidator) ValidateMetadata(metadata PluginMetadata) error {
	// Validate required fields
	if metadata.ID == "" {
		return fmt.Errorf("plugin ID is required")
	}
	if metadata.Name == "" {
		return fmt.Errorf("plugin name is required")
	}
	if metadata.Version == "" {
		return fmt.Errorf("plugin version is required")
	}
	if metadata.Author == "" {
		return fmt.Errorf("plugin author is required")
	}

	// Validate ID format (alphanumeric with dashes and underscores)
	if !isValidPluginID(metadata.ID) {
		return fmt.Errorf("plugin ID must contain only alphanumeric characters, dashes, and underscores")
	}

	// Validate version format (semantic versioning)
	if !isValidVersion(metadata.Version) {
		return fmt.Errorf("plugin version must follow semantic versioning (e.g., 1.0.0)")
	}

	// Validate endpoints
	if err := dpv.ValidateEndpoints(metadata.Endpoints); err != nil {
		return fmt.Errorf("endpoint validation failed: %w", err)
	}

	// Validate UI components
	if err := dpv.validateUIComponents(metadata.UIComponents); err != nil {
		return fmt.Errorf("UI component validation failed: %w", err)
	}

	// Validate dependencies
	if err := dpv.ValidateDependencies(metadata.Dependencies); err != nil {
		return fmt.Errorf("dependency validation failed: %w", err)
	}

	// Validate permissions
	if err := dpv.ValidatePermissions(metadata.Permissions); err != nil {
		return fmt.Errorf("permission validation failed: %w", err)
	}

	// Validate compatibility
	if err := dpv.validateCompatibility(metadata.Compatibility); err != nil {
		return fmt.Errorf("compatibility validation failed: %w", err)
	}

	// Validate configuration
	if err := dpv.ValidateConfiguration(metadata.Configuration); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	return nil
}

// ValidateEndpoints validates plugin endpoint configurations
func (dpv *DefaultPluginValidator) ValidateEndpoints(endpoints []EndpointConfig) error {
	if len(endpoints) == 0 {
		return fmt.Errorf("at least one endpoint is required")
	}

	if len(endpoints) > dpv.maxEndpoints {
		return fmt.Errorf("too many endpoints (%d), maximum allowed is %d", len(endpoints), dpv.maxEndpoints)
	}

	seenPaths := make(map[string]bool)
	seenHandlers := make(map[string]bool)

	for i, endpoint := range endpoints {
		// Validate required fields
		if endpoint.Path == "" {
			return fmt.Errorf("endpoint %d: path is required", i)
		}
		if endpoint.Method == "" {
			return fmt.Errorf("endpoint %d: method is required", i)
		}
		if endpoint.Handler == "" {
			return fmt.Errorf("endpoint %d: handler is required", i)
		}

		// Validate path format
		if !strings.HasPrefix(endpoint.Path, "/") {
			return fmt.Errorf("endpoint %d: path must start with '/'", i)
		}

		// Validate HTTP method
		methodUpper := strings.ToUpper(endpoint.Method)
		if !contains(dpv.supportedMethods, methodUpper) {
			return fmt.Errorf("endpoint %d: unsupported HTTP method '%s'", i, endpoint.Method)
		}

		// Check for duplicate paths with same method
		pathMethodKey := fmt.Sprintf("%s:%s", methodUpper, endpoint.Path)
		if seenPaths[pathMethodKey] {
			return fmt.Errorf("endpoint %d: duplicate path and method combination '%s %s'", i, endpoint.Method, endpoint.Path)
		}
		seenPaths[pathMethodKey] = true

		// Check for duplicate handlers
		if seenHandlers[endpoint.Handler] {
			return fmt.Errorf("endpoint %d: duplicate handler name '%s'", i, endpoint.Handler)
		}
		seenHandlers[endpoint.Handler] = true

		// Validate handler name format
		if !isValidHandlerName(endpoint.Handler) {
			return fmt.Errorf("endpoint %d: invalid handler name '%s'", i, endpoint.Handler)
		}

		// Validate rate limiting configuration
		if endpoint.RateLimit != nil {
			if err := dpv.validateRateLimit(*endpoint.RateLimit); err != nil {
				return fmt.Errorf("endpoint %d: rate limit validation failed: %w", i, err)
			}
		}

		// Validate authentication configuration
		if endpoint.Auth != nil {
			if err := dpv.validateAuth(*endpoint.Auth); err != nil {
				return fmt.Errorf("endpoint %d: auth validation failed: %w", i, err)
			}
		}

		// Validate validation configuration
		if endpoint.Validation != nil {
			if err := dpv.validateValidation(*endpoint.Validation); err != nil {
				return fmt.Errorf("endpoint %d: validation config failed: %w", i, err)
			}
		}
	}

	return nil
}

// ValidateDependencies validates plugin dependencies
func (dpv *DefaultPluginValidator) ValidateDependencies(dependencies []string) error {
	if len(dependencies) > dpv.maxDependencies {
		return fmt.Errorf("too many dependencies (%d), maximum allowed is %d", len(dependencies), dpv.maxDependencies)
	}

	seenDeps := make(map[string]bool)
	for i, dep := range dependencies {
		if dep == "" {
			return fmt.Errorf("dependency %d: empty dependency name", i)
		}

		if seenDeps[dep] {
			return fmt.Errorf("dependency %d: duplicate dependency '%s'", i, dep)
		}
		seenDeps[dep] = true

		// Validate dependency name format
		if !isValidDependencyName(dep) {
			return fmt.Errorf("dependency %d: invalid dependency name '%s'", i, dep)
		}
	}

	return nil
}

// ValidatePermissions validates plugin permissions
func (dpv *DefaultPluginValidator) ValidatePermissions(permissions []string) error {
	if len(permissions) > dpv.maxPermissions {
		return fmt.Errorf("too many permissions (%d), maximum allowed is %d", len(permissions), dpv.maxPermissions)
	}

	seenPerms := make(map[string]bool)
	for i, perm := range permissions {
		if perm == "" {
			return fmt.Errorf("permission %d: empty permission name", i)
		}

		if seenPerms[perm] {
			return fmt.Errorf("permission %d: duplicate permission '%s'", i, perm)
		}
		seenPerms[perm] = true

		// Check if permission is in allowed list
		if len(dpv.allowedPermissions) > 0 && !contains(dpv.allowedPermissions, perm) {
			return fmt.Errorf("permission %d: permission '%s' is not allowed", i, perm)
		}

		// Validate permission format
		if !isValidPermissionName(perm) {
			return fmt.Errorf("permission %d: invalid permission format '%s'", i, perm)
		}
	}

	return nil
}

// ValidateConfiguration validates plugin configuration
func (dpv *DefaultPluginValidator) ValidateConfiguration(config map[string]interface{}) error {
	// Basic configuration validation
	for key, value := range config {
		if key == "" {
			return fmt.Errorf("configuration key cannot be empty")
		}

		// Validate key format
		if !isValidConfigKey(key) {
			return fmt.Errorf("invalid configuration key format: '%s'", key)
		}

		// Validate value is not nil
		if value == nil {
			return fmt.Errorf("configuration value for key '%s' cannot be nil", key)
		}

		// Additional type validations can be added here
		switch v := value.(type) {
		case string:
			if len(v) > 1000 {
				return fmt.Errorf("configuration string value for key '%s' is too long (max 1000 characters)", key)
			}
		case map[string]interface{}:
			// Recursively validate nested objects
			if err := dpv.ValidateConfiguration(v); err != nil {
				return fmt.Errorf("nested configuration validation failed for key '%s': %w", key, err)
			}
		}
	}

	return nil
}

// Helper validation methods

func (dpv *DefaultPluginValidator) validateUIComponents(components []UIComponentConfig) error {
	seenNames := make(map[string]bool)
	seenRoutes := make(map[string]bool)

	for i, component := range components {
		if component.Name == "" {
			return fmt.Errorf("UI component %d: name is required", i)
		}
		if component.Route == "" {
			return fmt.Errorf("UI component %d: route is required", i)
		}
		if component.Component == "" {
			return fmt.Errorf("UI component %d: component is required", i)
		}

		// Check for duplicates
		if seenNames[component.Name] {
			return fmt.Errorf("UI component %d: duplicate name '%s'", i, component.Name)
		}
		seenNames[component.Name] = true

		if seenRoutes[component.Route] {
			return fmt.Errorf("UI component %d: duplicate route '%s'", i, component.Route)
		}
		seenRoutes[component.Route] = true

		// Validate route format
		if !strings.HasPrefix(component.Route, "/") {
			return fmt.Errorf("UI component %d: route must start with '/'", i)
		}
	}

	return nil
}

func (dpv *DefaultPluginValidator) validateCompatibility(compatibility map[string]string) error {
	allowedKeys := []string{"kubestellar", "go", "kubernetes", "helm", "docker"}

	for key, value := range compatibility {
		if !contains(allowedKeys, key) {
			return fmt.Errorf("unsupported compatibility key: '%s'", key)
		}

		if value == "" {
			return fmt.Errorf("compatibility value for '%s' cannot be empty", key)
		}

		// Validate version constraint format
		if !isValidVersionConstraint(value) {
			return fmt.Errorf("invalid version constraint for '%s': '%s'", key, value)
		}
	}

	return nil
}

func (dpv *DefaultPluginValidator) validateRateLimit(rateLimit RateLimitConfig) error {
	if rateLimit.Enabled {
		if rateLimit.RPM <= 0 {
			return fmt.Errorf("RPM must be positive when rate limiting is enabled")
		}
		if rateLimit.Burst <= 0 {
			return fmt.Errorf("burst capacity must be positive when rate limiting is enabled")
		}
		if rateLimit.WindowSizeMs <= 0 {
			return fmt.Errorf("window size must be positive when rate limiting is enabled")
		}
	}
	return nil
}

func (dpv *DefaultPluginValidator) validateAuth(auth AuthConfig) error {
	if auth.Required {
		if len(auth.Roles) == 0 && len(auth.Permissions) == 0 && len(auth.Scopes) == 0 {
			return fmt.Errorf("at least one of roles, permissions, or scopes must be specified when auth is required")
		}
	}
	return nil
}

func (dpv *DefaultPluginValidator) validateValidation(validation ValidationConfig) error {
	if len(validation.Required) > 0 {
		for _, field := range validation.Required {
			if field == "" {
				return fmt.Errorf("required field name cannot be empty")
			}
		}
	}

	if len(validation.ContentType) > 0 {
		allowedTypes := []string{"application/json", "application/xml", "text/plain", "multipart/form-data"}
		for _, ct := range validation.ContentType {
			if !contains(allowedTypes, ct) {
				return fmt.Errorf("unsupported content type: '%s'", ct)
			}
		}
	}

	return nil
}

// Utility functions

func isValidPluginID(id string) bool {
	// Plugin ID should be alphanumeric with dashes and underscores, 3-50 characters
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_-]{3,50}$`, id)
	return matched
}

func isValidVersion(version string) bool {
	// Basic semantic versioning pattern
	matched, _ := regexp.MatchString(`^v?(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$`, version)
	return matched
}

func isValidHandlerName(name string) bool {
	// Handler name should be a valid Go function name
	matched, _ := regexp.MatchString(`^[a-zA-Z][a-zA-Z0-9_]*$`, name)
	return matched
}

func isValidDependencyName(name string) bool {
	// Dependency name should be a valid package/binary name
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_.-]+$`, name)
	return matched
}

func isValidPermissionName(name string) bool {
	// Permission should be in format: resource.action
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$`, name)
	return matched
}

func isValidConfigKey(key string) bool {
	// Config key should be alphanumeric with underscores and dots
	matched, _ := regexp.MatchString(`^[a-zA-Z][a-zA-Z0-9_.]*$`, key)
	return matched
}

func isValidVersionConstraint(constraint string) bool {
	// Basic version constraint validation (>=1.0.0, ~1.0, etc.)
	matched, _ := regexp.MatchString(`^(>=|<=|>|<|~|\^)?v?(\d+)(\.\d+)?(\.\d+)?.*$`, constraint)
	return matched
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
