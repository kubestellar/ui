package dynamic_plugins

import (
	"github.com/gin-gonic/gin"
)

// PluginMetadata contains comprehensive plugin information
type PluginMetadata struct {
	ID            string                 `yaml:"id" json:"id"`
	Name          string                 `yaml:"name" json:"name"`
	Version       string                 `yaml:"version" json:"version"`
	Description   string                 `yaml:"description" json:"description"`
	Author        string                 `yaml:"author" json:"author"`
	Homepage      string                 `yaml:"homepage,omitempty" json:"homepage,omitempty"`
	Repository    string                 `yaml:"repository,omitempty" json:"repository,omitempty"`
	License       string                 `yaml:"license,omitempty" json:"license,omitempty"`
	Endpoints     []EndpointConfig       `yaml:"endpoints" json:"endpoints"`
	UIComponents  []UIComponentConfig    `yaml:"ui_components,omitempty" json:"ui_components,omitempty"`
	Dependencies  []string               `yaml:"dependencies,omitempty" json:"dependencies,omitempty"`
	Permissions   []string               `yaml:"permissions,omitempty" json:"permissions,omitempty"`
	Compatibility map[string]string      `yaml:"compatibility,omitempty" json:"compatibility,omitempty"`
	Configuration map[string]interface{} `yaml:"configuration,omitempty" json:"configuration,omitempty"`
	Security      SecurityConfig         `yaml:"security,omitempty" json:"security,omitempty"`
	Health        HealthConfig           `yaml:"health,omitempty" json:"health,omitempty"`
	LoadedAt      string                 `json:"loaded_at,omitempty"`
	LoadedFrom    string                 `json:"loaded_from,omitempty"`
	Status        string                 `json:"status,omitempty"`
}

// EndpointConfig defines plugin endpoint configuration
type EndpointConfig struct {
	Path        string            `yaml:"path" json:"path"`
	Method      string            `yaml:"method" json:"method"`
	Handler     string            `yaml:"handler" json:"handler"`
	Description string            `yaml:"description,omitempty" json:"description,omitempty"`
	Middleware  []string          `yaml:"middleware,omitempty" json:"middleware,omitempty"`
	RateLimit   *RateLimitConfig  `yaml:"rate_limit,omitempty" json:"rate_limit,omitempty"`
	Auth        *AuthConfig       `yaml:"auth,omitempty" json:"auth,omitempty"`
	Validation  *ValidationConfig `yaml:"validation,omitempty" json:"validation,omitempty"`
}

// UIComponentConfig defines frontend component configuration
type UIComponentConfig struct {
	Name        string            `yaml:"name" json:"name"`
	Route       string            `yaml:"route" json:"route"`
	Component   string            `yaml:"component" json:"component"`
	Title       string            `yaml:"title,omitempty" json:"title,omitempty"`
	Icon        string            `yaml:"icon,omitempty" json:"icon,omitempty"`
	Description string            `yaml:"description,omitempty" json:"description,omitempty"`
	Props       map[string]string `yaml:"props,omitempty" json:"props,omitempty"`
	Permissions []string          `yaml:"permissions,omitempty" json:"permissions,omitempty"`
}

// SecurityConfig defines security-related configuration
type SecurityConfig struct {
	Checksum         string   `yaml:"checksum,omitempty" json:"checksum,omitempty"`
	SignatureKey     string   `yaml:"signature_key,omitempty" json:"signature_key,omitempty"`
	TrustedOrigins   []string `yaml:"trusted_origins,omitempty" json:"trusted_origins,omitempty"`
	Sandboxed        bool     `yaml:"sandboxed,omitempty" json:"sandboxed,omitempty"`
	NetworkAccess    bool     `yaml:"network_access,omitempty" json:"network_access,omitempty"`
	FileSystemAccess bool     `yaml:"filesystem_access,omitempty" json:"filesystem_access,omitempty"`
}

// HealthConfig defines health check configuration
type HealthConfig struct {
	Enabled         bool   `yaml:"enabled,omitempty" json:"enabled,omitempty"`
	Endpoint        string `yaml:"endpoint,omitempty" json:"endpoint,omitempty"`
	IntervalSeconds int    `yaml:"interval_seconds,omitempty" json:"interval_seconds,omitempty"`
	TimeoutSeconds  int    `yaml:"timeout_seconds,omitempty" json:"timeout_seconds,omitempty"`
}

// RateLimitConfig defines rate limiting configuration
type RateLimitConfig struct {
	Enabled      bool `yaml:"enabled" json:"enabled"`
	RPM          int  `yaml:"rpm" json:"rpm"`             // Requests per minute
	Burst        int  `yaml:"burst" json:"burst"`         // Burst capacity
	WindowSizeMs int  `yaml:"window_ms" json:"window_ms"` // Window size in milliseconds
}

// AuthConfig defines authentication configuration
type AuthConfig struct {
	Required    bool     `yaml:"required" json:"required"`
	Roles       []string `yaml:"roles,omitempty" json:"roles,omitempty"`
	Permissions []string `yaml:"permissions,omitempty" json:"permissions,omitempty"`
	Scopes      []string `yaml:"scopes,omitempty" json:"scopes,omitempty"`
}

// ValidationConfig defines request validation configuration
type ValidationConfig struct {
	Schema      string                 `yaml:"schema,omitempty" json:"schema,omitempty"`
	Rules       map[string]interface{} `yaml:"rules,omitempty" json:"rules,omitempty"`
	Required    []string               `yaml:"required,omitempty" json:"required,omitempty"`
	ContentType []string               `yaml:"content_type,omitempty" json:"content_type,omitempty"`
}

// PluginError represents enhanced plugin error information
type PluginError struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   string                 `json:"details,omitempty"`
	Timestamp string                 `json:"timestamp"`
	Context   map[string]interface{} `json:"context,omitempty"`
}

func (pe *PluginError) Error() string {
	return pe.Message
}

// PluginStatus represents the current status of a plugin
type PluginStatus struct {
	State        string                 `json:"state"`  // loading, loaded, error, unloading
	Health       string                 `json:"health"` // healthy, unhealthy, unknown
	LastCheck    string                 `json:"last_check"`
	Errors       []PluginError          `json:"errors,omitempty"`
	Metrics      map[string]interface{} `json:"metrics,omitempty"`
	Uptime       string                 `json:"uptime,omitempty"`
	RequestCount int64                  `json:"request_count,omitempty"`
}

// KubestellarPlugin defines the enhanced interface that all dynamic plugins must implement
type KubestellarPlugin interface {
	// Core lifecycle methods
	Initialize(config map[string]interface{}) error
	GetMetadata() PluginMetadata
	GetHandlers() map[string]gin.HandlerFunc
	Health() error
	Cleanup() error

	// Enhanced methods for better plugin management
	Validate() error                                    // Validate plugin integrity and dependencies
	GetStatus() PluginStatus                            // Get current plugin status
	HandleError(err error) PluginError                  // Handle and format errors
	OnConfigChange(config map[string]interface{}) error // Handle configuration updates
	GetMetrics() map[string]interface{}                 // Get plugin metrics

	// Security methods
	GetPermissions() []string             // Get required permissions
	ValidateRequest(c *gin.Context) error // Validate incoming requests

	// Optional methods with default implementations
	OnLoad() error   // Called after successful loading
	OnUnload() error // Called before unloading
}

// PluginSymbol is the required symbol name in plugin .so files
const PluginSymbol = "NewPlugin"

// NewPluginFunc is the function signature for creating new plugin instances
type NewPluginFunc func() KubestellarPlugin

// PluginValidator defines validation interface for plugins
type PluginValidator interface {
	ValidateMetadata(metadata PluginMetadata) error
	ValidateEndpoints(endpoints []EndpointConfig) error
	ValidateDependencies(dependencies []string) error
	ValidatePermissions(permissions []string) error
	ValidateConfiguration(config map[string]interface{}) error
}

// PluginRegistry defines the interface for plugin registry operations
type PluginRegistry interface {
	Register(pluginID string, plugin KubestellarPlugin) error
	Unregister(pluginID string) error
	Get(pluginID string) (KubestellarPlugin, bool)
	List() map[string]KubestellarPlugin
	Exists(pluginID string) bool
	GetStatus(pluginID string) (PluginStatus, bool)
	UpdateStatus(pluginID string, status PluginStatus) error
}

// PluginLoader defines the interface for loading plugins from various sources
type PluginLoader interface {
	LoadFromFile(pluginPath, manifestPath string) error
	LoadFromGitHub(repoURL, version string) error
	LoadFromURL(url string, headers map[string]string) error
	Unload(pluginID string) error
	Reload(pluginID string) error
}

// Constants for plugin states and health statuses
const (
	// Plugin States
	StateLoading   = "loading"
	StateLoaded    = "loaded"
	StateError     = "error"
	StateUnloading = "unloading"
	StateUnloaded  = "unloaded"

	// Health States
	HealthHealthy   = "healthy"
	HealthUnhealthy = "unhealthy"
	HealthUnknown   = "unknown"
	HealthDegraded  = "degraded"

	// Error Codes
	ErrorCodeValidation    = "VALIDATION_ERROR"
	ErrorCodeDependency    = "DEPENDENCY_ERROR"
	ErrorCodePermission    = "PERMISSION_ERROR"
	ErrorCodeConfiguration = "CONFIGURATION_ERROR"
	ErrorCodeRuntime       = "RUNTIME_ERROR"
	ErrorCodeSecurity      = "SECURITY_ERROR"
)
