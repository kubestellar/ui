package plugins

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	"go.uber.org/zap"
)

var (
	pluginName    = "backup-plugin"
	pluginVersion = "0.0.1"
)

type backupPlugin struct {
	ep     string
	caCert string
	cert   string
	key    string
}

func (p backupPlugin) Name() string {
	return pluginName
}

func (p backupPlugin) Version() string {
	return pluginVersion
}
func (p backupPlugin) Enabled() int {
	return 1

}
func (p backupPlugin) Routes() []plugin.PluginRoutesMeta {

	routes := []plugin.PluginRoutesMeta{}
	routes = append(routes, plugin.PluginRoutesMeta{
		Method:  http.MethodGet,
		Path:    "/plugins/backup-plugin/",
		Handler: rootHandler,
	})
	routes = append(routes, plugin.PluginRoutesMeta{
		Method:  http.MethodGet,
		Path:    "/plugins/backup-plugin/snapshot",
		Handler: takeSnapshot,
	})
	routes = append(routes, plugin.PluginRoutesMeta{
		Method:  http.MethodGet,
		Path:    "/plugins/backup-plugin/restore",
		Handler: restoreFromSnapshot,
	})
	return routes
}

func rootHandler(c *gin.Context) {

}

func takeSnapshot(c *gin.Context) {

}
func restoreFromSnapshot(c *gin.Context) {

}

var bp backupPlugin

func init() {

	// check if etcd service exist if not create it
	_, _, err := k8s.GetClientSetWithConfigContext("kind-kubeflex")
	if err != nil {
		log.LogError("", zap.String("err", err.Error()))
	}

	bp = backupPlugin{
		ep:     "https://127.0.0.1:2379",
		caCert: "",
		cert:   "",
		key:    "",
	}
	Pm.Register(bp)
}
