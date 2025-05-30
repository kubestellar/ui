package services

import (
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/dynamic_plugins"
)

type PluginService struct {
	Manager *dynamic_plugins.PluginManager
}

func NewPluginService(router *gin.Engine) *PluginService {
	pluginDir := os.Getenv("PLUGIN_DIR")
	if pluginDir == "" {
		pluginDir = "./dynamic_plugins/cache"
	}

	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		log.Printf("Warning: Failed to create plugin directory %s: %v", pluginDir, err)
	}

	manager := dynamic_plugins.NewPluginManager(router, pluginDir)
	log.Printf("Dynamic plugin system initialized with directory: %s", pluginDir)

	return &PluginService{
		Manager: manager,
	}
}

func (ps *PluginService) AutoLoadPlugins() {
	autoLoadPlugins := os.Getenv("AUTO_LOAD_PLUGINS")
	if autoLoadPlugins != "" {
		repos := strings.Split(autoLoadPlugins, ",")
		for _, repo := range repos {
			repo = strings.TrimSpace(repo)
			if repo != "" {
				go func(repoURL string) {
					log.Printf("Auto-loading plugin from: %s", repoURL)
					if err := ps.Manager.LoadPluginFromGitHub(repoURL); err != nil {
						log.Printf("Failed to auto-load plugin from %s: %v", repoURL, err)
					} else {
						log.Printf("Successfully auto-loaded plugin from %s", repoURL)
					}
				}(repo)
			}
		}
	}
}
