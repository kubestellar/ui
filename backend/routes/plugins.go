package routes

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

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
	// installedPath := "routes/plugins.json"
	// availablePath := "routes/demo-plugins.json"

	// if err := loadInstalledPlugins(registry, installedPath); err != nil {
	// 	log.Printf("***************** Error loading installed plugins: %v *****************", err)
	// }

	// if err := loadAvailablePlugins(registry, availablePath); err != nil {
	// 	log.Printf("***************** Error loading demo plugins: %v *****************", err)
	// }

	klog.V(1).Info("***************** Loaded plugins *****************")
	// router.POST("/api/plugins/install", installHandler(registry, installedPath))
	// router.DELETE("/api/plugins/:name", removeHandler(registry, installedPath))
	// router.GET("/api/plugins", listHandler(registry))
	// router.PUT("/api/plugins/:name/enable", enableHandler(registry, installedPath))
	// router.GET("/api/plugins/available", availableHandler(registry))
	router.POST("/api/plugins/clone", func(c *gin.Context) {
		var req struct {
			RepoURL string `json:"repoURL"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		if err := registry.CloneTheRepo(req.RepoURL); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to clone repository: %v", err)})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Repository cloned successfully"})
	},
	)
}

func (r *PluginRegistry) CloneTheRepo(repoURL string) error {
	log.Printf("Cloning repository: %s", repoURL)

	currentDir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	pluginsDir := filepath.Join(currentDir, "plugins")
	if err := os.MkdirAll(pluginsDir, 0755); err != nil {
		return fmt.Errorf("failed to create plugins directory: %w", err)
	}

	repoName := filepath.Base(strings.TrimSuffix(repoURL, ".git"))
	clonePath := filepath.Join(pluginsDir, repoName)

	cmd := exec.Command("git", "clone", repoURL, clonePath)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	log.Printf("Git stdout:\n%s", stdout.String())
	log.Printf("Git stderr:\n%s", stderr.String())

	if err != nil {
		return fmt.Errorf("git clone failed: %v", err)
	}

	log.Printf("Repository cloned successfully into: %s", clonePath)

	os.Chdir("/root/plugins/Plugins/backend")

	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-o", "kubestellar-cluster-plugin.so", "main.go")
	if err := buildCmd.Run(); err != nil {
		log.Printf("buildsharedobject: Error building shared object: %v\n", err)
	}

	log.Println("buildsharedobject: Building shared object...")
	return nil
}

// func buildsharedobject() error {
// 	// Placeholder for building shared object logic
// 	// This function should contain the logic to build the shared object from the plugin manifest
// 	// change directory to /root/plugins/Plugins/backend
// 	// then run this 	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-o", "kubestellar-cluster-plugin.so", "main.go")
// 	os.Chdir("/root/plugins/Plugins/backend")

// 	buildCmd := exec.Command("go", "build", "-buildmode=plugin", "-o", "kubestellar-cluster-plugin.so", "main.go")
// 	if err := buildCmd.Run(); err != nil {
// 		log.Printf("buildsharedobject: Error building shared object: %v\n", err)
// 	}

// 	log.Println("buildsharedobject: Building shared object...")
// 	// Simulate some processing
// 	return nil
// }
