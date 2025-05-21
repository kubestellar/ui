package plugins

import (
	"context"
	"net/http"
	"strings"

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

	return routes
}

func rootHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"name": pluginName, "version": pluginVersion})
}

// takes snapshot of the cluster
func takeSnapshot(c *gin.Context) {
	err := freeBackupResources(bp.c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = createBackupJob(bp.c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, nil)
}

var bp backupPlugin

func init() {
	//get k8s client
	c, _, err := k8s.GetClientSetWithContext("kind-kubeflex")
	if err != nil {
		// try with k3d
		c, _, err = k8s.GetClientSetWithContext("k3d-kubeflex")
		if err != nil {
			log.LogError("failed to initialized backup plugin", zap.String("error", err.Error()))
			return
		}

	}
	//try for k3d if it exists

	// currently only supporting postgr for structuredes backend
	bp = backupPlugin{
		storageType: "postgres",
		c:           c,
	}
	// register your with plugin manager otherwise routes wont be sent to gin
	Pm.Register(bp)
}

// create job that takes backup
func createBackupJob(c *kubernetes.Clientset) error {

	s, err := c.CoreV1().Secrets("kubeflex-system").Get(context.TODO(), "postgres-postgresql", metav1.GetOptions{})
	if err != nil {
		return err
	}
	password := string(s.Data["postgres-password"])
	err = pvc(c)
	if err != nil {
		return err
	}
	// create job
	var bl, ttl int32 = 3, 120
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
							Args:    []string{"pg_dumpall -U $user -h $host  -f /mnt/backup-vol/pgdump.sql  && ls /mnt/backup-vol/"},
							Env: []corev1.EnvVar{
								corev1.EnvVar{
									Name:  "PGPASSWORD",
									Value: password,
								},
								corev1.EnvVar{
									Name:  "host",
									Value: "postgres-postgresql.kubeflex-system.svc.cluster.local",
								},
								corev1.EnvVar{
									Name:  "user",
									Value: "postgres",
								},
							},
							VolumeMounts: []corev1.VolumeMount{
								corev1.VolumeMount{
									Name:      "backup-vol",
									MountPath: "/mnt/backup-vol",
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						corev1.Volume{
							Name: "backup-vol",
							VolumeSource: corev1.VolumeSource{
								PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
									ClaimName: "backup-vol-claim",
								},
							},
						},
					},
					RestartPolicy: corev1.RestartPolicyNever,
				},
			},
			BackoffLimit:            &bl,
			TTLSecondsAfterFinished: &ttl,
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return err
	}
	log.LogInfo("Created backup job", zap.String("name", j.Name))
	return nil

}

func pvc(c *kubernetes.Clientset) error {
	storageClass := "standard"
	pvc, err := c.CoreV1().PersistentVolumeClaims("default").Create(context.TODO(), &corev1.PersistentVolumeClaim{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "backup-vol-claim",
			Namespace: "default",
		},
		Spec: corev1.PersistentVolumeClaimSpec{
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: resource.MustParse("5Gi"),
				},
			},
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			StorageClassName: &storageClass,
		},
	}, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	log.LogInfo("created a pvc", zap.String("name", pvc.Name))
	return nil

}

func freeBackupResources(c *kubernetes.Clientset) error {
	// check if the resource exist
	_, err := c.CoreV1().PersistentVolumeClaims("default").Get(context.TODO(), "backup-vol-claim", metav1.GetOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil
		}
		return err
	}
	err = c.CoreV1().PersistentVolumeClaims("default").Delete(context.TODO(), "backup-vol-claim", *metav1.NewDeleteOptions(0))
	if err != nil {
		return err
	}
	return err
}
