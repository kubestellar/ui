package plugin_management

import (
	"log"
	"os"
	"plugin"
	"sync"

	"github.com/Per0x1de-1337/pluginapi"
	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v2"
)

type Plugin struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Version     string `json:"version"`
	Author      string `json:"author"`
}

type PluginYAML struct {
	ID            string `yaml:"id"`
	Name          string `yaml:"name"`
	Version       string `yaml:"version"`
	Description   string `yaml:"description"`
	Author        string `yaml:"author"`
	Compatibility struct {
		KubeStellar string `yaml:"kubestellar"`
		Go          string `yaml:"go"`
	} `yaml:"compatibility"`
	Endpoints []struct {
		Path    string `yaml:"path"`
		Method  string `yaml:"method"`
		Handler string `yaml:"handler"`
	} `yaml:"endpoints"`
	UIComponents []struct {
		Name      string `yaml:"name"`
		Route     string `yaml:"route"`
		Component string `yaml:"component"`
	} `yaml:"ui_components"`
	Dependencies []string `yaml:"dependencies"`
	Permissions  []string `yaml:"permissions"`
}

var (
	installedPlugins []Plugin
	pluginsMutex     sync.Mutex
)

func AddToInstalledPlugins(p Plugin) {
	pluginsMutex.Lock()
	defer pluginsMutex.Unlock()

	installedPlugins = append(installedPlugins, p)
}

func AddPluginToListHandler(c *gin.Context) {
	var newPlugin Plugin
	if err := c.ShouldBindJSON(&newPlugin); err != nil {
		c.JSON(400, gin.H{"error": "Invalid plugin data"})
		return
	}
	AddDummyPlugin()
	AddToInstalledPlugins(newPlugin)

	c.JSON(200, gin.H{"message": "Plugin added successfully", "plugin": newPlugin})
}

// GetPluginManifestHandler retrieves the manifest of a specific plugin
func GetPluginManifestHandler(c *gin.Context) {
	pluginID := c.Query("pluginID")
	if pluginID == "" {
		c.JSON(400, gin.H{"error": "Plugin ID is required"})
		return
	}

	// Here you would typically fetch the plugin manifest from a database or a file
	// For demonstration, we will return a dummy manifest

	manifest := gin.H{
		"id":          pluginID,
		"name":        "Sample Plugin",
		"description": "This is a sample plugin manifest",
	}

	c.JSON(200, manifest)
}

// GetPluginID retrieves the ID of a specific plugin
func GetPluginID(c *gin.Context) {
	yamlPath := "/root/plugins/Plugins/plugin.yaml"

	data, err := os.ReadFile(yamlPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read YAML file", "details": err.Error()})
		return
	}

	var plugin PluginYAML
	if err := yaml.Unmarshal(data, &plugin); err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse YAML file", "details": err.Error()})
		return
	}

	if plugin.ID == "" {
		c.JSON(400, gin.H{"error": "Plugin ID not found in YAML file"})
		return
	}
	c.JSON(200, gin.H{"pluginID": plugin.ID})
}

func AddDummyPlugin() {
	dummy := Plugin{
		Name:        "Cluster onboarding and detaching",
		Description: "onboard and detach",
		Version:     "0.1.0",
		Author:      "peroxide",
	}
	AddToInstalledPlugins(dummy)
}

// ListAllInstalledPluginsHandler returns all plugins currently added
func ListAllInstalledPluginsHandler(c *gin.Context) {
	pluginsMutex.Lock()
	defer pluginsMutex.Unlock()

	c.JSON(200, gin.H{"installed_plugins": installedPlugins})
}

func InitializePlugin() {
	plug, err := plugin.Open("/home/peroxide/ui/backend/plugins/Plugins/backend/kubestellar-cluster-plugin.so") // here will the backend
	// will crash because of the plugin is not built with the same runtime as the backend
	// and there are some issues in the docker image which is meant to be fixed to fix this issue
	if err != nil {
		log.Printf("Error opening plugin: %v", err)
	}

	symNewPlugin, err := plug.Lookup("NewPlugin")
	if err != nil {
		log.Printf("Error looking up NewPlugin: %v", err)
	}

	newPluginFunc, ok := symNewPlugin.(func() pluginapi.KubestellarPlugin)
	if !ok {
		log.Printf("NewPlugin has wrong signature")
	}

	kubePlugin := newPluginFunc()

	if err := kubePlugin.Initialize(nil); err != nil {
		log.Printf("Plugin initialization failed: %v", err)
	}

	log.Printf("Plugin %s initialized successfully")
}

func InitializeHandlers(c *gin.Context) {
	// Initialize the plugin
	err := func() error {
		InitializePlugin()
		return nil
	}()

	if err != nil {
		log.Printf("Error during plugin initialization: %v", err)
		c.JSON(500, gin.H{"error": "Error during plugin initialization", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Handlers initialized successfully"})
}

func init() {
	AddDummyPlugin()
}
