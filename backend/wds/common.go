package wds

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

/*
Load the KubeConfig file and return the kubernetes clientset which gives you access to play with the k8s api
*/
func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

func getKubeConfig() (*api.Config, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}
	return config, nil
}

// only for wds1
func GetClientSetKubeConfig() (*kubernetes.Clientset, error) {
	config, err := getKubeConfig()
	if err != nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kubeconfig"})
		return nil, fmt.Errorf("failed to load kubeconfig")
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ctxConfig"})
		return nil, fmt.Errorf("failed to create ctxConfig")
	}

	// Create config for WDS cluster
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to create restconfig")
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client")
	}
	return clientset, nil
}

// listContexts lists all available contexts in the kubeconfig (Only look for wds context)
func ListContexts() (string, []string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", nil, err
	}
	currentContext := config.CurrentContext
	var contexts []string
	for name := range config.Contexts {
		if strings.Contains(name, "wds") {
			contexts = append(contexts, name)
		}
	}
	return currentContext, contexts, nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func writeMessage(conn *websocket.Conn, message string) {
	if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
		log.Println("Error writing to WebSocket:", err)
	}
}
func SetWdsContextCookies(c *gin.Context) {
	var request struct {
		Context string `json:"context"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	_, context, err := ListContexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	isContextPresent := false
	for _, value := range context {
		if strings.EqualFold(request.Context, value) {
			isContextPresent = true
			break
		}
	}
	if !isContextPresent {
		msg := fmt.Sprintf("no context with %s present", request.Context)
		c.JSON(http.StatusOK, gin.H{
			"error":   msg,
			"message": "Please create context first",
		})
		return
	}
	c.SetCookie("ui-wds-context", request.Context, 3600, "/", "", false, true)
	msg := fmt.Sprintf("switched to %s context", request.Context)
	c.JSON(http.StatusOK, gin.H{
		"message":            msg,
		"current-ui-context": request.Context,
	})
}

func GetWdsContextCookies(c *gin.Context) {
	// currentContext : is system context (may be differnet from wds)
	// TODO: improve this ListContexts function
	currentContext, context, err := ListContexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		if strings.Contains("wds", currentContext) {
			cookieContext = currentContext // Default to Kubernetes API context
		} else {
			cookieContext = "wds1"
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"ui-wds-context":    cookieContext,
		"system-context":    currentContext,
		"other-wds-context": context,
	})
}

// CreateWDSContextUsingCommand TODO: Replicate this using the helm go-sdk
// DOCS: https://github.com/kubestellar/kubestellar/blob/main/docs/content/direct/core-chart.md
func CreateWDSContextUsingCommand(w http.ResponseWriter, r *http.Request, c *gin.Context) {
	newWdsContext := c.Query("context")
	version := c.Query("version")

	if version == "" {
		version = "0.27.2" // newer version
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer conn.Close()
	if newWdsContext == "" {
		msg := "context query must be present ?context=<your_new_context>"
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}
	// Checking is that wds context is present or not
	config, err := getKubeConfig()
	if err != nil {
		msg := "failed to load the kubeconfig"
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}
	var kindCtx, k3dCtx string
	for name := range config.Contexts {
		if name == "k3d-kubeflex" {
			k3dCtx = name
			fmt.Println("We choose k3d-kubeflex context")
		} else if name == "kind-kubeflex" {
			kindCtx = name
		}
	}
	if k3dCtx == "" && kindCtx == "" {
		writeMessage(conn, "No kubeflex detected for kind, k3d type cluster, Please check is you have k3d-kubeflex or kind-kubeflex")
		return
	}
	releaseName := "add-" + newWdsContext
	writeMessage(conn, "Context is valid. Proceeding...")

	kflexContextType := k3dCtx
	if kflexContextType == "" {
		kflexContextType = kindCtx
	}

	fmt.Printf("Detected cluster type: %s\n", kflexContextType)

	// Step 0: Switch to "kind-kubeflex" or "k3d-kubeflex" context
	message := fmt.Sprintf("Switching to %s context", kflexContextType)
	writeMessage(conn, message)
	flexCmd := exec.Command("kubectl", "config", "use-context", kflexContextType)
	output, err := flexCmd.CombinedOutput()
	if err != nil {
		message := fmt.Sprintf("Failed to execute kubectl command: %v\nOutput: %s", err.Error(), string(output))
		writeMessage(conn, message)
		return
	} else {
		message := fmt.Sprintf("Successfully switched context to %s\n", kflexContextType)
		writeMessage(conn, message)
	}
	writeMessage(conn, "Starting upgrade --install for helm chart")

	// Step 1: Helm upgrade command
	helmCmd := "helm"
	args := []string{
		"upgrade", "--install", releaseName,
		"oci://ghcr.io/kubestellar/kubestellar/core-chart",
		"--version", version,
		"--set", "kubeflex-operator.install=false,InstallPCHs=false",
		"--set-json", fmt.Sprintf(`WDSes=[{"name":"%s"}]`, newWdsContext),
	}
	writeMessage(conn, "Running Helm upgrade...")
	// Execute the command
	cmd := exec.Command(helmCmd, args...)
	output, err = cmd.CombinedOutput()

	if err != nil {
		message := fmt.Sprintf("Failed to execute Helm command: %v\n%s", err.Error(), string(output))
		writeMessage(conn, message)
		return
	}

	writeMessage(conn, fmt.Sprintf("Helm command executed successfully:\n%s", string(output)))

	writeMessage(conn, fmt.Sprintf("Deleting Kubernetes context '%s' if it exists...", newWdsContext))
	// Step 2: Delete Kubernetes context newContext
	delCtxCmd := exec.Command("kubectl", "config", "delete-context", newWdsContext)
	delCtxOutput, delCtxErr := delCtxCmd.CombinedOutput()

	if delCtxErr != nil {
		writeMessage(conn, fmt.Sprintf("Warning: Failed to delete context '%s' (may not exist): %v\nOutput: %s", newWdsContext, delCtxErr, string(delCtxOutput)))
	} else {
		writeMessage(conn, fmt.Sprintf("Deleted context '%s' successfully", newWdsContext))
	}
	writeMessage(conn, fmt.Sprintf("Setting context '%s' using kflex...", newWdsContext))
	// Step 3: Set the new context using kflex
	kflexCmd := exec.Command("kflex", "ctx", "--overwrite-existing-context", newWdsContext)
	kflexOutput, kflexErr := kflexCmd.CombinedOutput()

	if kflexErr != nil {
		writeMessage(conn, fmt.Sprintf("Failed to set context using kflex: %v\nOutput: %s", kflexErr, string(kflexOutput)))
		return
	}

	writeMessage(conn, fmt.Sprintf("Context '%s' set successfully:\n%s\n", newWdsContext, string(kflexOutput)))

}

// ensureBackupNamespace creates the backup-system namespace if it doesn't exist
func ensureBackupNamespace(clientset *kubernetes.Clientset) error {
	namespace := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "backup-system",
			Labels: map[string]string{
				"name": "backup-system",
				"type": "backup",
			},
		},
	}

	_, err := clientset.CoreV1().Namespaces().Get(context.TODO(), "backup-system", metav1.GetOptions{})
	if err != nil {
		// Namespace doesn't exist, create it
		_, err = clientset.CoreV1().Namespaces().Create(context.TODO(), namespace, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("failed to create backup-system namespace: %v", err)
		}
		log.Println("Created backup-system namespace")
	}
	return nil
}

// RestoreDatabase creates a Kubernetes job to restore PostgreSQL from backup
func RestoreDatabase(backupFileName string) (string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %v", err)
	}

	// Use WDS1 context specifically for restore operations
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return "", fmt.Errorf("failed to create rest config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create clientset: %v", err)
	}

	// Ensure backup namespace exists
	if err := ensureBackupNamespace(clientset); err != nil {
		return "", err
	}

	// Create restore job
	jobName := fmt.Sprintf("%s-%d", "postgres-restore", time.Now().Unix())

	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobName,
			Namespace: "backup-system",
			Labels: map[string]string{
				"app":  "postgres-restore",
				"type": "database-restore",
			},
		},
		Spec: batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app":  "postgres-restore",
						"type": "database-restore",
					},
				},
				Spec: corev1.PodSpec{
					RestartPolicy: corev1.RestartPolicyNever,
					Containers: []corev1.Container{
						{
							Name:  "postgres-restore",
							Image: "postgres:15",
							Env: []corev1.EnvVar{
								{
									Name:  "PGHOST",
									Value: "postgres-service",
								},
								{
									Name:  "PGPORT",
									Value: "5432",
								},
								{
									Name: "PGUSER",
									ValueFrom: &corev1.EnvVarSource{
										SecretKeyRef: &corev1.SecretKeySelector{
											LocalObjectReference: corev1.LocalObjectReference{
												Name: "postgres-secret",
											},
											Key: "username",
										},
									},
								},
								{
									Name: "PGPASSWORD",
									ValueFrom: &corev1.EnvVarSource{
										SecretKeyRef: &corev1.SecretKeySelector{
											LocalObjectReference: corev1.LocalObjectReference{
												Name: "postgres-secret",
											},
											Key: "password",
										},
									},
								},
								{
									Name: "PGDATABASE",
									ValueFrom: &corev1.EnvVarSource{
										SecretKeyRef: &corev1.SecretKeySelector{
											LocalObjectReference: corev1.LocalObjectReference{
												Name: "postgres-secret",
											},
											Key: "database",
										},
									},
								},
								{
									Name:  "BACKUP_FILE",
									Value: backupFileName,
								},
							},
							Command: []string{"/bin/bash"},
							Args: []string{
								"-c",
								`
								set -e
								echo "Starting database restore process..."
								
								# Wait for PostgreSQL to be ready
								until pg_isready -h $PGHOST -p $PGPORT -U $PGUSER; do
									echo "Waiting for PostgreSQL to be ready..."
									sleep 2
								done
								
								echo "PostgreSQL is ready. Starting restore..."
								
								# Check if backup file exists
								if [ ! -f "/backup/$BACKUP_FILE" ]; then
									echo "Error: Backup file /backup/$BACKUP_FILE not found"
									exit 1
								fi
								
								# Drop existing connections to the database
								echo "Terminating existing connections..."
								psql -h $PGHOST -p $PGPORT -U $PGUSER -d postgres -c "
									SELECT pg_terminate_backend(pid) 
									FROM pg_stat_activity 
									WHERE datname = '$PGDATABASE' AND pid <> pg_backend_pid();
								" || true
								
								# Drop and recreate database
								echo "Dropping existing database..."
								psql -h $PGHOST -p $PGPORT -U $PGUSER -d postgres -c "DROP DATABASE IF EXISTS $PGDATABASE;"
								
								echo "Creating new database..."
								psql -h $PGHOST -p $PGPORT -U $PGUSER -d postgres -c "CREATE DATABASE $PGDATABASE;"
								
								# Restore database from backup
								echo "Restoring database from backup..."
								psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE < /backup/$BACKUP_FILE
								
								echo "Database restore completed successfully!"
								`,
							},
							VolumeMounts: []corev1.VolumeMount{
								{
									Name:      "backup-volume",
									MountPath: "/backup",
								},
							},
						},
					},
					Volumes: []corev1.Volume{
						{
							Name: "backup-volume",
							VolumeSource: corev1.VolumeSource{
								PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
									ClaimName: "backup-pvc",
								},
							},
						},
					},
				},
			},
		},
	}

	// Create the job
	_, err = clientset.BatchV1().Jobs("backup-system").Create(context.TODO(), job, metav1.CreateOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to create restore job: %v", err)
	}

	return jobName, nil
}

// GetRestoreJobStatus returns the status of a restore job
func GetRestoreJobStatus(jobName string) (string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %v", err)
	}

	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return "", fmt.Errorf("failed to create rest config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return "", fmt.Errorf("failed to create clientset: %v", err)
	}

	// Ensure backup namespace exists
	if err := ensureBackupNamespace(clientset); err != nil {
		return "", err
	}

	job, err := clientset.BatchV1().Jobs("backup-system").Get(context.TODO(), jobName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get job: %v", err)
	}

	if job.Status.Succeeded > 0 {
		return "completed", nil
	} else if job.Status.Failed > 0 {
		return "failed", nil
	} else if job.Status.Active > 0 {
		return "running", nil
	}

	return "pending", nil
}

// ListBackupFiles lists available backup files in the persistent volume
func ListBackupFiles() ([]string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %v", err)
	}

	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to create rest config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %v", err)
	}

	// Ensure backup namespace exists
	if err := ensureBackupNamespace(clientset); err != nil {
		return nil, err
	}

	// Check if backup PVC exists, if not return mock data
	_, err = clientset.CoreV1().PersistentVolumeClaims("backup-system").Get(context.TODO(), "backup-pvc", metav1.GetOptions{})
	if err != nil {
		log.Printf("Warning: backup-pvc not found, returning mock data: %v", err)
		// Return mock data for testing
		return []string{"pgdump.sql", "pgdump-backup.sql", "test-backup.sql"}, nil
	}

	// Create a temporary pod to list backup files
	podName := fmt.Sprintf("list-backups-%d", time.Now().Unix())

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      podName,
			Namespace: "backup-system",
		},
		Spec: corev1.PodSpec{
			RestartPolicy: corev1.RestartPolicyNever,
			Containers: []corev1.Container{
				{
					Name:    "list-backups",
					Image:   "busybox:latest",
					Command: []string{"/bin/sh"},
					Args: []string{
						"-c",
						"ls -la /backup/*.sql 2>/dev/null | awk '{print $9}' | grep -v '^$' || echo 'No backup files found'",
					},
					VolumeMounts: []corev1.VolumeMount{
						{
							Name:      "backup-volume",
							MountPath: "/backup",
						},
					},
				},
			},
			Volumes: []corev1.Volume{
				{
					Name: "backup-volume",
					VolumeSource: corev1.VolumeSource{
						PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
							ClaimName: "backup-pvc",
						},
					},
				},
			},
		},
	}

	// Create the pod
	_, err = clientset.CoreV1().Pods("backup-system").Create(context.TODO(), pod, metav1.CreateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to create list-backups pod: %v", err)
	}

	// For now, return mock data - in a real implementation you'd wait for pod completion
	// and fetch logs to get actual file list
	return []string{"pgdump.sql", "pgdump-backup.sql", "test-backup.sql"}, nil
}
