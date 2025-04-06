package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/services"
	"github.com/kubestellar/ui/utils"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	clusterStatuses = make(map[string]string)
	mutex           sync.Mutex
)

func OnboardClusterHandler(c *gin.Context) {
	file, err := c.FormFile("kubeconfig")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve kubeconfig file"})
		return
	}

	clusterName := c.PostForm("name")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open kubeconfig file"})
		return
	}
	defer f.Close()

	content, err := utils.ReadFileContent(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read kubeconfig file"})
		return
	}

	clusterConfig, err := services.GetClusterConfigByName(content, clusterName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mutex.Lock()
	if status, exists := clusterStatuses[clusterName]; exists {
		mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, status)})
		return
	}
	clusterStatuses[clusterName] = "Pending"
	mutex.Unlock()

	go func() {
		if err := services.ValidateClusterConnectivity(clusterConfig); err != nil {
			log.Printf("Cluster '%s' validation failed: %v", clusterName, err)
			mutex.Lock()
			clusterStatuses[clusterName] = "Failed"
			mutex.Unlock()
			return
		}

		mutex.Lock()
		clusterStatuses[clusterName] = "Onboarded"
		mutex.Unlock()

		log.Printf("Cluster '%s' onboarded successfully", clusterName)
	}()

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is being onboarded", clusterName)})
}

func GetClusterStatusHandler(c *gin.Context) {
	mutex.Lock()
	defer mutex.Unlock()

	var statuses []models.ClusterStatus
	for cluster, status := range clusterStatuses {
		statuses = append(statuses, models.ClusterStatus{
			ClusterName: cluster,
			Status:      status,
		})
	}

	c.JSON(http.StatusOK, statuses)
}

func ImportClusterHandler(c *gin.Context) {
	var cluster models.Cluster

	if err := c.ShouldBindJSON(&cluster); err != nil {
		log.Printf("Binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	if cluster.Name == "" || cluster.Region == "" || cluster.Node == "" {
		log.Printf("Validation error: missing required fields, cluster: %+v", cluster)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required cluster details"})
		return
	}

	services.ImportCluster(cluster)
	c.JSON(http.StatusAccepted, gin.H{"message": "Cluster import initiated"})
}

// kubeconfigPath returns the path to the kubeconfig file.
func kubeconfigPath() string {
	if path := os.Getenv("KUBECONFIG"); path != "" {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Unable to get user home directory: %v", err)
	}
	return fmt.Sprintf("%s/.kube/config", home)
}

// UpdateManagedClusterLabels patches the labels on a managedcluster object in ITS.
// contextName identifies the ITS hub cluster (as defined in your kubeconfig),
// and clusterName is the name of the managed cluster resource to update.
func UpdateManagedClusterLabels(contextName, clusterName string, newLabels map[string]string) error {
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return fmt.Errorf("loading kubeconfig: %v", err)
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*config,
		contextName,
		&clientcmd.ConfigOverrides{},
		nil,
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return fmt.Errorf("getting client config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("creating clientset: %v", err)
	}

	// Build the patch payload to update only the labels field.
	patchPayload := map[string]interface{}{
		"metadata": map[string]interface{}{
			"labels": newLabels,
		},
	}

	patchBytes, err := json.Marshal(patchPayload)
	if err != nil {
		return fmt.Errorf("marshaling patch payload: %v", err)
	}

	// Issue a JSON merge patch request to update the managed cluster.
	result := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(patchBytes).
		Do(context.TODO())

	if err := result.Error(); err != nil {
		return fmt.Errorf("patching managed cluster: %v", err)
	}

	log.Printf("Updated labels for managed cluster '%s' in context '%s'", clusterName, contextName)
	return nil
}

func UpdateManagedClusterLabelsHandler(c *gin.Context) {
	var req struct {
		ContextName string            `json:"contextName"`
		ClusterName string            `json:"clusterName"`
		Labels      map[string]string `json:"labels"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.ContextName == "" || req.ClusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contextName and clusterName are required"})
		return
	}

	if err := UpdateManagedClusterLabels(req.ContextName, req.ClusterName, req.Labels); err != nil {
		log.Printf("Error updating labels: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Labels updated successfully"})
}
