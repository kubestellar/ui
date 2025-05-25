package routes

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"fmt"
	"os/exec"

	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"
)

// Plugin represents a plugin in the marketplace
type Plugin struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName"`
	Version     string   `json:"version"`
	Description string   `json:"description,omitempty"`
	Rating      float64  `json:"rating,omitempty"`
	Downloads   int      `json:"downloads,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Enabled     bool     `json:"enabled"`
	Backend     struct {
		Image string            `json:"image"`
		Port  int               `json:"port"`
		Env   map[string]string `json:"env,omitempty"`
	} `json:"backend,omitempty"`
	Frontend struct {
		EntryPoint string   `json:"entryPoint"`
		Image      string   `json:"image,omitempty"`
		Routes     []string `json:"routes"`
	} `json:"frontend,omitempty"`
}

type PluginRegistry struct {
	plugins map[string]*Plugin
	mu      sync.RWMutex
}

func NewPluginRegistry() *PluginRegistry {
	log.Println("***************** Creating new PluginRegistry *****************")
	return &PluginRegistry{
		plugins: make(map[string]*Plugin),
	}
}

func (r *PluginRegistry) AddPlugin(plugin *Plugin) {
	log.Printf("***************** Adding plugin: %v *****************", plugin)
	r.mu.Lock()
	r.plugins[plugin.Name] = plugin
	r.mu.Unlock()
}

func (r *PluginRegistry) GetPlugin(name string) (*Plugin, bool) {
	log.Printf("***************** Getting plugin: %s *****************", name)
	r.mu.RLock()
	plugin, exists := r.plugins[name]
	r.mu.RUnlock()
	return plugin, exists
}

func (r *PluginRegistry) ListPlugins() []*Plugin {
	log.Println("***************** Listing installed plugins *****************")
	r.mu.RLock()
	plugins := make([]*Plugin, 0, len(r.plugins))
	for _, p := range r.plugins {
		plugins = append(plugins, p)
	}
	r.mu.RUnlock()
	return plugins
}

func (r *PluginRegistry) ListDemoPlugins() []*Plugin {
	log.Println("***************** Listing demo plugins *****************")
	// Load demo plugins from demo-plugins.json
	data, err := os.ReadFile("demo-plugins.json")
	if err != nil {
		log.Printf("Error reading demo plugins: %v", err)
		return []*Plugin{}
	}

	var demoPlugins []*Plugin
	if err := json.Unmarshal(data, &demoPlugins); err != nil {
		log.Printf("Error parsing demo plugins: %v", err)
		return []*Plugin{}
	}

	return demoPlugins
}

func (r *PluginRegistry) RemovePlugin(name string) bool {
	log.Printf("***************** Removing plugin: %s *****************", name)
	r.mu.Lock()
	_, exists := r.plugins[name]
	delete(r.plugins, name)
	r.mu.Unlock()
	return exists
}

func (r *PluginRegistry) EnablePlugin(name string, enabled bool) error {
	log.Printf("***************** Enabling/Disabling plugin: %s, Enabled: %v *****************", name, enabled)
	r.mu.Lock()
	plugin, exists := r.plugins[name]
	if !exists {
		r.mu.Unlock()
		return fmt.Errorf("plugin %s not found", name)
	}

	if enabled == plugin.Enabled {
		r.mu.Unlock()
		return nil // Already in desired state
	}

	plugin.Enabled = enabled
	r.mu.Unlock()

	if enabled {
		if err := r.StartPlugin(plugin); err != nil {
			return fmt.Errorf("failed to start plugin: %v", err)
		}
	} else {
		if err := r.StopPlugin(plugin); err != nil {
			return fmt.Errorf("failed to stop plugin: %v", err)
		}
	}

	return nil
}

func (r *PluginRegistry) StartPlugin(plugin *Plugin) error {
	log.Printf("***************** Starting plugin: %s *****************", plugin.Name)
	
	// Start backend if configured
	if plugin.Backend.Image != "" {
		cmd := exec.Command("docker-compose", "-f", "-d")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to start backend: %v", err)
		}
	}

	// TODO: Start frontend container if needed
	
	return nil
}

func (r *PluginRegistry) StopPlugin(plugin *Plugin) error {
	log.Printf("***************** Stopping plugin: %s *****************", plugin.Name)
	
	// Stop backend if configured
	if plugin.Backend.Image != "" {
		cmd := exec.Command("docker", "compose", "-f", fmt.Sprintf("/tmp/docker-compose-%s.yml", plugin.Name), "down")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to stop backend: %v", err)
		}
	}

	// TODO: Stop frontend container if needed
	
	return nil
}

func savePlugins(r *PluginRegistry, path string) error {
	log.Printf("***************** Saving plugins to file: %s *****************", path)
	r.mu.RLock()
	plugins := make([]*Plugin, 0, len(r.plugins))
	for _, p := range r.plugins {
		plugins = append(plugins, p)
	}
	r.mu.RUnlock()

	data, err := json.Marshal(plugins)
	if err != nil {
		log.Printf("***************** Error marshaling plugins: %v *****************", err)
		return err
	}

	err = os.WriteFile(path, data, 0644)
	if err != nil {
		log.Printf("***************** Error writing plugins to file: %v *****************", err)
	}
	return err
}

// RegisterPluginAPI mounts all plugin endpoints under /api/plugins
func RegisterPluginAPI(router *gin.Engine) {
	log.Println("***************** Registering plugin API *****************")

	registry := NewPluginRegistry()
	installedPath := "routes/plugins.json"
	availablePath := "routes/demo-plugins.json"

	if err := loadInstalledPlugins(registry, installedPath); err != nil {
		log.Printf("***************** Error loading installed plugins: %v *****************", err)
	}

	if err := loadAvailablePlugins(registry, availablePath); err != nil {
		log.Printf("***************** Error loading demo plugins: %v *****************", err)
	}

	klog.V(1).Info("***************** Loaded plugins *****************")
	router.POST("/api/plugins/install", installHandler(registry, installedPath))
	router.DELETE("/api/plugins/:name", removeHandler(registry, installedPath))
	router.GET("/api/plugins", listHandler(registry))
	router.PUT("/api/plugins/:name/enable", enableHandler(registry, installedPath))
	router.GET("/api/plugins/available", availableHandler(registry))
}

func loadInstalledPlugins(r *PluginRegistry, path string) error {
	log.Printf("***************** Loading installed plugins from: %s *****************", path)
    
    // Read the plugins file
    data, err := os.ReadFile(path)
    if err != nil {
        log.Printf("***************** Error reading installed plugins file: %v *****************", err)
        return err
    }

    // Parse the JSON
    var plugins []*Plugin
    if err := json.Unmarshal(data, &plugins); err != nil {
        log.Printf("***************** Error parsing installed plugins: %v *****************", err)
        return err
    }

    // Add all plugins to the registry
    for _, plugin := range plugins {
        r.AddPlugin(plugin)
    }
    return nil
}

func loadAvailablePlugins(r *PluginRegistry, path string) error {
	log.Printf("***************** Loading available plugins from: %s *****************", path)
    
    // Read the available plugins file
    data, err := os.ReadFile(path)
    if err != nil {
        log.Printf("***************** Error reading available plugins file: %v *****************", err)
        return err
    }

    // Parse the JSON
    var plugins []*Plugin
    if err := json.Unmarshal(data, &plugins); err != nil {
        log.Printf("***************** Error parsing available plugins: %v *****************", err)
        return err
    }

    // Add all plugins to the registry
    for _, plugin := range plugins {
        r.AddPlugin(plugin)
    }
    return nil
}

func installHandler(r *PluginRegistry, installedPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("***************** Handling plugin installation *****************")
		var req struct {
			Name string `json:"name"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("***************** Error binding JSON: %v *****************", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		plugin, exists := r.GetPlugin(req.Name)
		if !exists {
			log.Printf("***************** Plugin not found: %s *****************", req.Name)
			c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
			return
		}

		plugin.Downloads++
		if err := savePlugins(r, installedPath); err != nil {
			log.Printf("***************** Error saving plugins: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save plugin data"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Plugin installed successfully", "plugin": plugin})
	}
}

func removeHandler(r *PluginRegistry, installedPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("***************** Handling plugin removal *****************")
		name := c.Param("name")
		if !r.RemovePlugin(name) {
			log.Printf("***************** Plugin not found: %s *****************", name)
			c.JSON(http.StatusNotFound, gin.H{"error": "Plugin not found"})
			return
		}

		if err := savePlugins(r, installedPath); err != nil {
			log.Printf("***************** Error saving plugins: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save plugin data"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Plugin removed successfully"})
	}
}

func listHandler(r *PluginRegistry) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("***************** Handling plugin listing *****************")
		plugins := r.ListPlugins()
		c.JSON(http.StatusOK, plugins)
	}
}

func enableHandler(r *PluginRegistry, installedPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("***************** Handling plugin enable/disable request *****************")
		name := c.Param("name")
		log.Printf("***************** Plugin name: %s *****************", name)

		var req struct {
			Enabled bool `json:"enabled"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("***************** Error binding JSON: %v *****************", err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request body",
				"details": err.Error(),
			})
			return
		}
		log.Printf("***************** Requested state: %v *****************", req.Enabled)

		plugin, exists := r.GetPlugin(name)
		if !exists {
			log.Printf("***************** Plugin not found: %s *****************", name)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Plugin not found",
				"name":  name,
			})
			return
		}

		if plugin.Enabled == req.Enabled {
			log.Printf("***************** Plugin %s is already in desired state: %v *****************", name, req.Enabled)
			c.JSON(http.StatusOK, gin.H{
				"message": "Plugin is already in desired state",
				"plugin":  plugin,
			})
			return
		}

		log.Println("***************** Generating Docker Compose file *****************")
		composeContent := fmt.Sprintf(`version: '3.8'
services:
  %s-backend:
	image: %s
	ports:
	  - '%d:%d'
	environment:
`, name, plugin.Backend.Image, plugin.Backend.Port, plugin.Backend.Port)

		for key, value := range plugin.Backend.Env {
			composeContent += fmt.Sprintf("      - %s=%s\n", key, value)
		}

		if plugin.Frontend.EntryPoint != "" {
			composeContent += fmt.Sprintf(`
  %s-frontend:
	image: %s
	ports:
	  - '5174:5174'
	environment:
	  - VITE_API_URL=http://%s-backend:%d
`, name, plugin.Frontend.Image, name, plugin.Backend.Port)
		}

		composePath := fmt.Sprintf("/tmp/docker-compose-%s.yml", name)
		if err := os.WriteFile(composePath, []byte(composeContent), 0644); err != nil {
			log.Printf("***************** Error writing Docker Compose file: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to generate Docker Compose file",
				"details": err.Error(),
			})
			return
		}
		log.Printf("***************** Docker Compose file written to: %s *****************", composePath)

		var action string
		if req.Enabled {
			action = "up -d"
		} else {
			action = "down"
		}
		log.Printf("***************** Executing docker compose action: %s *****************", action)
		if err := os.Chdir("/tmp"); err != nil {
			log.Printf("***************** Error switching to /tmp directory: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to switch to /tmp directory",
				"details": err.Error(),
			})
			return
		}
		
		cmd := exec.Command("docker", "compose", "-f", composePath, "up", "-d")
		log.Printf("***************** Command: %s *****************", cmd)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			log.Printf("***************** Error executing docker compose %s: %v *****************", action, err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   fmt.Sprintf("Failed to %s plugin services", action),
				"details": err.Error(),
			})
			return
		}
		log.Printf("***************** Docker compose action %s completed successfully *****************", action)

		if err := r.EnablePlugin(name, req.Enabled); err != nil {
			log.Printf("***************** Error updating plugin state: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update plugin state",
				"details": err.Error(),
			})
			return
		}
		log.Printf("***************** Plugin state updated: %s, Enabled: %v *****************", name, req.Enabled)

		if err := savePlugins(r, installedPath); err != nil {
			log.Printf("***************** Error saving plugin state: %v *****************", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to save plugin state",
				"details": err.Error(),
			})
			return
		}
		log.Println("***************** Plugin state saved successfully *****************")

		if err := os.Remove(composePath); err != nil {
			log.Printf("***************** Error removing Docker Compose file: %v *****************", err)
		} else {
			log.Printf("***************** Docker Compose file removed: %s *****************", composePath)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Plugin %s %s successfully", name, action),
			"plugin":  plugin,
			"status":  req.Enabled,
		})
		log.Printf("***************** Plugin %s enable/disable request completed *****************", name)
	}
}

func availableHandler(r *PluginRegistry) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("***************** Handling available plugins listing *****************")
		allPlugins := r.ListPlugins()
		availablePlugins := make([]*Plugin, 0)
		for _, p := range allPlugins {
			if !p.Enabled {
				availablePlugins = append(availablePlugins, p)
			}
		}

		c.JSON(http.StatusOK, availablePlugins)
	}
}
