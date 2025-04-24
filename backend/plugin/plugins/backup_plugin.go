package plugins

import (
	"net/http"
	"time"

	"os/exec"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	v3 "go.etcd.io/etcd/client/v3"
	"go.uber.org/zap"
)

var (
	pluginName    = "backup-plugin"
	pluginVersion = "0.0.1"
)

type backupPlugin struct {
	cfg v3.Config
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
	cmd := exec.Command("kubectl",
		"--context", "kind-kubeflex", "-n", "kube-system", "port-forward", "pods/etcd-kubeflex-control-plane", "2379:2379")
	err := cmd.Start()
	if err != nil {
		log.LogError("failed to start cmd", zap.String("err", err.Error()))
	}
	bp = backupPlugin{v3.Config{
		Endpoints:   []string{"https://127.0.0.1:2379"},
		DialTimeout: time.Second * 2,
	}}
	Pm.Register(bp)
}
