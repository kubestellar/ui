package plugin

import (
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
)

// PluginManifest defines the metadata for a plugin
type PluginManifest struct {
	Name         string                 `json:"name"`
	Version      string                 `json:"version"`
	Description  string                 `json:"description"`
	Author       string                 `json:"author"`
	Homepage     string                 `json:"homepage,omitempty"`
	License      string                 `json:"license,omitempty"`
	Keywords     []string               `json:"keywords,omitempty"`
	Icon         string                 `json:"icon,omitempty"`
	Screenshots  []string               `json:"screenshots,omitempty"`
	Backend      BackendConfig          `json:"backend"`
	Frontend     FrontendConfig         `json:"frontend"`
	Config       map[string]interface{} `json:"config,omitempty"`
	Dependencies []Dependency           `json:"dependencies,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// BackendConfig defines backend-specific configuration
type BackendConfig struct {
	Enabled    bool                   `json:"enabled"`
	Routes     []PluginRoute          `json:"routes"`
	Middleware []string               `json:"middleware,omitempty"`
	Database   *DatabaseConfig        `json:"database,omitempty"`
	Services   []ServiceConfig        `json:"services,omitempty"`
	Config     map[string]interface{} `json:"config,omitempty"`
}

// FrontendConfig defines frontend-specific configuration
type FrontendConfig struct {
	Enabled     bool                   `json:"enabled"`
	Navigation  []PluginNavigationItem `json:"navigation,omitempty"`
	Widgets     []PluginWidgetConfig   `json:"widgets,omitempty"`
	Assets      []PluginAssetConfig    `json:"assets,omitempty"`
	Routes      []FrontendRoute        `json:"routes,omitempty"`
	Permissions []string               `json:"permissions,omitempty"`
	Config      map[string]interface{} `json:"config,omitempty"`
}

// PluginRoute defines a backend API route
type PluginRoute struct {
	Path        string           `json:"path"`
	Method      string           `json:"method"`
	Handler     string           `json:"handler"`
	Middleware  []string         `json:"middleware,omitempty"`
	Description string           `json:"description,omitempty"`
	Parameters  []RouteParameter `json:"parameters,omitempty"`
	Response    ResponseSchema   `json:"response,omitempty"`
}

// FrontendRoute defines a frontend page route
type FrontendRoute struct {
	Path        string   `json:"path"`
	Component   string   `json:"component"`
	Name        string   `json:"name"`
	Icon        string   `json:"icon,omitempty"`
	Description string   `json:"description,omitempty"`
	Protected   bool     `json:"protected"`
	Permissions []string `json:"permissions,omitempty"`
}

// PluginNavigationItem defines navigation menu items
type PluginNavigationItem struct {
	Path        string   `json:"path"`
	Label       string   `json:"label"`
	Icon        string   `json:"icon"`
	Order       int      `json:"order,omitempty"`
	Parent      string   `json:"parent,omitempty"`
	Children    []string `json:"children,omitempty"`
	Permissions []string `json:"permissions,omitempty"`
}

// PluginWidgetConfig defines widget configuration
type PluginWidgetConfig struct {
	Name        string                 `json:"name"`
	Type        string                 `json:"type"` // chart, table, metrics, custom, card, dashboard
	Title       string                 `json:"title"`
	Description string                 `json:"description,omitempty"`
	Component   string                 `json:"component"`
	Props       map[string]interface{} `json:"props,omitempty"`
	Size        WidgetSize             `json:"size,omitempty"`
	Position    WidgetPosition         `json:"position,omitempty"`
	Permissions []string               `json:"permissions,omitempty"`
}

// PluginAssetConfig defines static assets
type PluginAssetConfig struct {
	Path string `json:"path"`
	Type string `json:"type"`           // js, css, image
	Load string `json:"load,omitempty"` // eager, lazy
}

// Dependency defines plugin dependencies
type Dependency struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Type    string `json:"type"` // plugin, npm, go
}

// DatabaseConfig defines database requirements
type DatabaseConfig struct {
	Tables     []TableSchema `json:"tables,omitempty"`
	Migrations []string      `json:"migrations,omitempty"`
}

// ServiceConfig defines external service requirements
type ServiceConfig struct {
	Name     string                 `json:"name"`
	Type     string                 `json:"type"` // redis, postgres, mongodb, etc.
	Config   map[string]interface{} `json:"config,omitempty"`
	Required bool                   `json:"required"`
}

// WidgetSize defines widget dimensions
type WidgetSize struct {
	Width  string `json:"width,omitempty"`  // sm, md, lg, xl, full
	Height string `json:"height,omitempty"` // sm, md, lg, xl, auto
}

// WidgetPosition defines widget placement
type WidgetPosition struct {
	Row    int    `json:"row,omitempty"`
	Column int    `json:"column,omitempty"`
	Area   string `json:"area,omitempty"` // header, sidebar, main, footer
}

// RouteParameter defines API route parameters
type RouteParameter struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description,omitempty"`
}

// ResponseSchema defines API response structure
type ResponseSchema struct {
	Type        string                 `json:"type"`
	Description string                 `json:"description,omitempty"`
	Properties  map[string]interface{} `json:"properties,omitempty"`
}

// TableSchema defines database table structure
type TableSchema struct {
	Name    string         `json:"name"`
	Columns []ColumnSchema `json:"columns"`
	Indexes []IndexSchema  `json:"indexes,omitempty"`
}

// ColumnSchema defines database column structure
type ColumnSchema struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Nullable   bool   `json:"nullable,omitempty"`
	Default    string `json:"default,omitempty"`
	PrimaryKey bool   `json:"primary_key,omitempty"`
}

// IndexSchema defines database index structure
type IndexSchema struct {
	Name    string   `json:"name"`
	Columns []string `json:"columns"`
	Unique  bool     `json:"unique,omitempty"`
}

// Enhanced plugin interface with dynamic capabilities
type EnhancedPlugin interface {
	Plugin // Inherit from existing interface

	// Additional methods for enhanced functionality
	Manifest() PluginManifest
	Install(config map[string]interface{}) error
	Uninstall() error
	Configure(config map[string]interface{}) error
	GetConfiguration() map[string]interface{}

	// Health and metrics
	HealthCheck() error
	GetMetrics() map[string]interface{}

	// Dynamic route management
	RegisterDynamicRoute(route PluginRoute, handler gin.HandlerFunc) error
	UnregisterDynamicRoute(path, method string) error
	GetDynamicRoutes() []PluginRoute

	// Event system
	OnEnable() error
	OnDisable() error
	OnConfigUpdate(config map[string]interface{}) error
}

// PluginTemplate provides a base structure for creating plugins
type PluginTemplate struct {
	manifest      PluginManifest
	enabled       bool
	config        map[string]interface{}
	dynamicRoutes map[string]PluginRoute
}

// NewPluginTemplate creates a new plugin template
func NewPluginTemplate(manifest PluginManifest) *PluginTemplate {
	return &PluginTemplate{
		manifest:      manifest,
		enabled:       false,
		config:        make(map[string]interface{}),
		dynamicRoutes: make(map[string]PluginRoute),
	}
}

// Base implementations for PluginTemplate
func (pt *PluginTemplate) Name() string {
	return pt.manifest.Name
}

func (pt *PluginTemplate) Version() string {
	return pt.manifest.Version
}

func (pt *PluginTemplate) Enabled() int {
	if pt.enabled {
		return 1
	}
	return 0
}

func (pt *PluginTemplate) Routes() []PluginRoutesMeta {
	var routes []PluginRoutesMeta
	for _, route := range pt.manifest.Backend.Routes {
		routes = append(routes, PluginRoutesMeta{
			Method: route.Method,
			Path:   route.Path,
			Handler: func(c *gin.Context) {
				// Default handler - should be overridden
				c.JSON(200, gin.H{"message": "Plugin route not implemented"})
			},
		})
	}
	return routes
}

func (pt *PluginTemplate) Manifest() PluginManifest {
	return pt.manifest
}

func (pt *PluginTemplate) Install(config map[string]interface{}) error {
	pt.config = config
	return nil
}

func (pt *PluginTemplate) Uninstall() error {
	pt.enabled = false
	pt.config = make(map[string]interface{})
	return nil
}

func (pt *PluginTemplate) Configure(config map[string]interface{}) error {
	pt.config = config
	return nil
}

func (pt *PluginTemplate) GetConfiguration() map[string]interface{} {
	return pt.config
}

func (pt *PluginTemplate) HealthCheck() error {
	return nil
}

func (pt *PluginTemplate) GetMetrics() map[string]interface{} {
	return map[string]interface{}{
		"enabled": pt.enabled,
		"routes":  len(pt.dynamicRoutes),
	}
}

func (pt *PluginTemplate) RegisterDynamicRoute(route PluginRoute, handler gin.HandlerFunc) error {
	key := route.Method + ":" + route.Path
	pt.dynamicRoutes[key] = route
	return nil
}

func (pt *PluginTemplate) UnregisterDynamicRoute(path, method string) error {
	key := method + ":" + path
	delete(pt.dynamicRoutes, key)
	return nil
}

func (pt *PluginTemplate) GetDynamicRoutes() []PluginRoute {
	var routes []PluginRoute
	for _, route := range pt.dynamicRoutes {
		routes = append(routes, route)
	}
	return routes
}

func (pt *PluginTemplate) OnEnable() error {
	pt.enabled = true
	return nil
}

func (pt *PluginTemplate) OnDisable() error {
	pt.enabled = false
	return nil
}

func (pt *PluginTemplate) OnConfigUpdate(config map[string]interface{}) error {
	pt.config = config
	return nil
}

// Helper functions for manifest creation
func CreateManifest(name, version, description, author string) PluginManifest {
	return PluginManifest{
		Name:        name,
		Version:     version,
		Description: description,
		Author:      author,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Backend: BackendConfig{
			Enabled: true,
			Routes:  []PluginRoute{},
		},
		Frontend: FrontendConfig{
			Enabled:    true,
			Navigation: []PluginNavigationItem{},
			Widgets:    []PluginWidgetConfig{},
			Assets:     []PluginAssetConfig{},
			Routes:     []FrontendRoute{},
		},
		Config:       make(map[string]interface{}),
		Dependencies: []Dependency{},
	}
}

// ManifestToJSON converts manifest to JSON string
func ManifestToJSON(manifest PluginManifest) (string, error) {
	jsonData, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return "", err
	}
	return string(jsonData), nil
}

// ManifestFromJSON creates manifest from JSON string
func ManifestFromJSON(jsonData string) (PluginManifest, error) {
	var manifest PluginManifest
	err := json.Unmarshal([]byte(jsonData), &manifest)
	return manifest, err
}
