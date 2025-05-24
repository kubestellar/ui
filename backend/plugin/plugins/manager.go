package plugins

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin/common"
	"go.uber.org/zap"
)

// pluginManager is a centralized manager that handles KubeStellar plugins
type pluginManager struct {
	plugins map[string]common.Plugin
	mx      sync.Mutex
}

// returns all the routes if there are any for the gin engine
func (pm *pluginManager) SetupPluginsRoutes(e *gin.Engine) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	log.LogInfo("setting up plugin route...")
	for _, p := range pm.plugins {
		log.LogInfo(fmt.Sprintf("routes for Plugin--->%s", p.Name()))
		for _, r := range p.Routes() {

			switch r.Method {
			case http.MethodGet:
				e.GET(r.Path, r.Handler)
				log.LogInfo("",
					zap.String("method", http.MethodGet),
					zap.String("path", r.Path))

			case http.MethodPost:
				e.POST(r.Path, r.Handler)
				log.LogInfo("",
					zap.String("method", http.MethodPost),
					zap.String("path", r.Path),
				)
			case http.MethodDelete:
				e.DELETE(r.Path, r.Handler)
				log.LogInfo("",
					zap.String("method", http.MethodDelete),
					zap.String("path", r.Path),
				)
			case http.MethodPatch:
				e.PATCH(r.Path, r.Handler)
				log.LogInfo("",
					zap.String("method", http.MethodPatch),
					zap.String("path", r.Path))

			}
		}
	}
}

// registers a plugin to plugin Manager
func (pm *pluginManager) Register(p common.Plugin) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	pm.plugins[p.Name()] = p
	log.LogInfo("registered a new plugin", zap.String("NAME", p.Name()))
}

// deregisters  a plugin to plugin manager
func (pm *pluginManager) Deregister(p common.Plugin) {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	delete(pm.plugins, p.Name())
	log.LogInfo("deregistered plugin", zap.String("NAME", p.Name()))
}

// GetPlugins returns all registered plugins
func (pm *pluginManager) GetPlugins() []common.Plugin {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	plugins := make([]common.Plugin, 0, len(pm.plugins))
	for _, p := range pm.plugins {
		plugins = append(plugins, p)
	}
	return plugins
}

// GetPlugin returns a specific plugin by name
func (pm *pluginManager) GetPlugin(name string) common.Plugin {
	pm.mx.Lock()
	defer pm.mx.Unlock()
	return pm.plugins[name]
}

var Pm *pluginManager = &pluginManager{plugins: map[string]common.Plugin{}}
