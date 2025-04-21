package plugins

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	etcd "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"
)

var (
	pluginName    = "backup-plugin"
	pluginVersion = "0.0.1"
)

type backupPlugin struct {
	etcdClient *etcd.Client
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
	c.JSON(200, gin.H{"name": pluginName, "version": pluginVersion})
}

func takeSnapshot(c *gin.Context) {

}
func restoreFromSnapshot(c *gin.Context) {

}

var bp backupPlugin

func init() {
	etcdClient, err := etcd.New(etcd.Config{
		Endpoints:   []string{},
		DialTimeout: time.Second * 2,
	})
	if err != nil {
		log.LogError("failed to created etcd client for backup plugin",
			zap.String("err", err.Error()))
		return
	}
	bp = backupPlugin{etcdClient: etcdClient}
	Pm.Register(bp)
}
