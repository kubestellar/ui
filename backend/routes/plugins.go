package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/plugin/common"
	"github.com/kubestellar/ui/plugin/plugins"
)

// PluginResponse represents plugin information returned to the frontend
type PluginResponse struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Enabled     bool              `json:"enabled"`
	Type        string            `json:"type"` // "static" or "dynamic"
	Status      string            `json:"status"`
	Description string            `json:"description"`
	Routes      []PluginRouteInfo `json:"routes"`
}

// PluginRouteInfo represents route information for a plugin
type PluginRouteInfo struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description,omitempty"`
}

// setupPluginRoutes registers plugin API endpoints
func setupPluginRoutes(router *gin.Engine) {
	api := router.Group("/api")
	{
		api.GET("/plugins", listPlugins)
		api.GET("/plugins/:name", getPluginDetails)
	}
}

// listPlugins returns a list of all registered plugins
func listPlugins(c *gin.Context) {
	allPlugins := plugins.Pm.GetPlugins()
	result := make([]PluginResponse, 0, len(allPlugins))

	for _, p := range allPlugins {
		routes := make([]PluginRouteInfo, 0)
		for _, r := range p.Routes() {
			routes = append(routes, PluginRouteInfo{
				Method:      r.Method,
				Path:        r.Path,
				Description: getRouteDescription(r),
			})
		}

		status := PluginResponse{
			Name:        p.Name(),
			Version:     p.Version(),
			Enabled:     p.Enabled() > 0,
			Type:        "static", // Default to static for now
			Status:      getPluginStatus(p),
			Description: p.Description(),
			Routes:      routes,
		}

		result = append(result, status)
	}

	c.JSON(http.StatusOK, result)
}

// getPluginDetails returns details for a specific plugin
func getPluginDetails(c *gin.Context) {
	name := c.Param("name")
	p := plugins.Pm.GetPlugin(name)

	if p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
		return
	}

	routes := make([]PluginRouteInfo, 0)
	for _, r := range p.Routes() {
		routes = append(routes, PluginRouteInfo{
			Method:      r.Method,
			Path:        r.Path,
			Description: getRouteDescription(r),
		})
	}

	status := PluginResponse{
		Name:        p.Name(),
		Version:     p.Version(),
		Enabled:     p.Enabled() > 0,
		Type:        "static", // Default to static for now
		Status:      getPluginStatus(p),
		Description: p.Description(),
		Routes:      routes,
	}

	c.JSON(http.StatusOK, status)
}

// getPluginStatus returns the plugin status string
func getPluginStatus(p common.Plugin) string {
	if p.Enabled() > 0 {
		return "active"
	}
	return "inactive"
}

// getRouteDescription returns a description for a route
func getRouteDescription(r common.PluginRoutesMeta) string {
	if r.Description != "" {
		return r.Description
	}
	
	// Generate a default description based on the path and method
	switch r.Method {
	case http.MethodGet:
		return "Get information from " + r.Path
	case http.MethodPost:
		return "Create or update resource at " + r.Path
	case http.MethodDelete:
		return "Delete resource at " + r.Path
	default:
		return "Operation on " + r.Path
	}
}
