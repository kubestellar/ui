package plugins

import (
	"context"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/plugin"
	"go.uber.org/zap"
	v1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

var (
	pluginName    = "backup-plugin"
	pluginVersion = "0.0.1"
)

type backupPlugin struct {
	storageType string
	c           *kubernetes.Clientset
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
	c.JSON(http.StatusOK, gin.H{"name": pluginName, "version": pluginVersion})
}

// takes snapshot of the cluster
func takeSnapshot(c *gin.Context) {

}
func restoreFromSnapshot(c *gin.Context) {

}

var bp backupPlugin

func init() {
	//get k8s client
	c, _, err := k8s.GetClientSetWithContext("kind-kubeflex")
	if err != nil {
		log.LogError("failed initialize backup plugin", zap.String("err", err.Error()))
		return
	}
	//
	// currently only supporting postgres backend
	bp = backupPlugin{
		storageType: "postgres",
		c:           c,
	}
	Pm.Register(bp)
}

// create job that takes backup
func createBackupJob(c *kubernetes.Clientset) error {
	//get db password
	s, err := c.CoreV1().Secrets("kubeflex-system").Get(context.TODO(), "postgres-postgresql", metav1.GetOptions{})
	if err != nil {
		return err
	}
	var password []byte
	_, err = base64.StdEncoding.Decode(s.Data["postgres-password"], password)
	if err != nil {
		return err
	}
	// create job
	j, err := c.BatchV1().Jobs("default").Create(context.TODO(), &v1.Job{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "batch/v1",
			Kind:       "job",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "pg-job-ks",
			Namespace: "default",
		},
		Spec: v1.JobSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						corev1.Container{
							Name:    "pg-jobc",
							Image:   "postgres:16",
							Command: []string{"/bin/sh", "-c"},
							Args:    []string{"pg_dump -p $password -u $user -h $host"},
							Env: []corev1.EnvVar{
								corev1.EnvVar{
									Name:  "password",
									Value: string(password),
								},
								corev1.EnvVar{
									Name:  "host",
									Value: "postgres-postgressql.kubeflex-system.svc.cluster.local",
								},
								corev1.EnvVar{
									Name:  "user",
									Value: "postgres",
								},
							},
						},
					},
				},
			},
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return err
	}
	log.LogInfo("Created backup job", zap.String("name", j.Name))
	return nil

}
func makePv(c *kubernetes.Clientset) error {

	pv, err := c.CoreV1().PersistentVolumes().Create(context.TODO(), &corev1.PersistentVolume{

		ObjectMeta: metav1.ObjectMeta{
			Name: "pg-backup-vol",
		},
		Spec: corev1.PersistentVolumeSpec{
			Capacity: corev1.ResourceList{
				corev1.ResourceStorage: resource.MustParse("1Gi"),
			},
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
		},
	}, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	log.LogInfo("created pv", zap.String("name", pv.Name))
	return nil
}
