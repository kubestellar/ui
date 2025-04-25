package plugins

import (
	"fmt"
	"net/http"

	"os/exec"

	"github.com/gin-gonic/gin"
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
	c.JSON(200, gin.H{"name": pluginName, "version": pluginVersion})
}

func takeSnapshot(c *gin.Context) {

	cmd := exec.Command("etcdtl",
		fmt.Sprintf("--endppoints=%s", bp.ep), fmt.Sprintf("--cacert=%s", bp.caCert),
		fmt.Sprintf("--cert=%s", bp.cert), fmt.Sprintf("--key=%s", bp.key), "save")
	err := cmd.Run()
	if err != nil {
		log.LogError("failed to take snapshot", zap.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success"})

}
func restoreFromSnapshot(c *gin.Context) {

	cmd := exec.Command("etcdtl",
		fmt.Sprintf("--endppoints=%s", bp.ep), fmt.Sprintf("--cacert=%s", bp.caCert),
		fmt.Sprintf("--cert=%s", bp.cert), fmt.Sprintf("--key=%s", bp.key), "restore")
	err := cmd.Run()
	if err != nil {
		log.LogError("failed to restore from snapshot", zap.String("error", err.Error()))
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "success"})

}

var bp backupPlugin

func init() {
	cmd := exec.Command("kubectl",
		"--context", "kind-kubeflex", "-n", "kube-system", "port-forward", "pods/etcd-kubeflex-control-plane", "2379:2379")
	err := cmd.Start()
	if err != nil {
		log.LogError("failed to start cmd", zap.String("error", err.Error()))
	}

	bp = backupPlugin{
		ep:     "https://127.0.0.1:2379",
		caCert: "",
		cert:   "",
		key:    "",
	}
	Pm.Register(bp)
}
