package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	bpv1alpha1 "github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/typed/control/v1alpha1"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/services"
	"github.com/kubestellar/ui/utils"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
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

	clearLabelsPayload := map[string]interface{}{
		"metadata": map[string]interface{}{
			"labels": map[string]string{},
		},
	}
	clearLabelsBytes, err := json.Marshal(clearLabelsPayload)
	if err != nil {
		return fmt.Errorf("marshaling clear-labels payload: %v", err)
	}

	clearResult := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(clearLabelsBytes).
		Do(context.TODO())

	if err := clearResult.Error(); err != nil {
		return fmt.Errorf("clearing existing labels: %v", err)
	}

	// Step 2: Add the new labels
	newLabelsPayload := map[string]interface{}{
		"metadata": map[string]interface{}{
			"labels": newLabels,
		},
	}
	newLabelsBytes, err := json.Marshal(newLabelsPayload)
	if err != nil {
		return fmt.Errorf("marshaling new-labels payload: %v", err)
	}

	addResult := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(newLabelsBytes).
		Do(context.TODO())

	if err := addResult.Error(); err != nil {
		return fmt.Errorf("adding new labels: %v", err)
	}

	log.Printf("Replaced labels for managed cluster '%s' in context '%s'", clusterName, contextName)
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

func DeleteClusterLabel(c *gin.Context) {
	contextName := c.Param("context")
	clusterName := c.Param("cluster")
	labelKey := c.Param("key")

	log.Printf("Attempting to delete label '%s' from cluster '%s' in context '%s'", labelKey, clusterName, contextName)

	if contextName == "" || clusterName == "" || labelKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameters"})
		return
	}

	if isProtectedLabel(labelKey) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Cannot delete protected system label",
			"label": labelKey,
		})
		return
	}

	// Check if this label is used in any binding policy
	if isLabelUsedInBindingPolicy(labelKey, clusterName) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Cannot delete label used in binding policy",
			"label": labelKey,
		})
		return
	}

	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error loading kubeconfig: %v", err)})
		return
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*config,
		contextName,
		&clientcmd.ConfigOverrides{},
		nil,
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error getting client config: %v", err)})
		return
	}

	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creating dynamic client: %v", err)})
		return
	}

	managedClusterGVR := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	// Get the ManagedCluster using dynamic client
	cluster, err := dynamicClient.Resource(managedClusterGVR).Get(context.TODO(), clusterName, metav1.GetOptions{})
	if err != nil {
		log.Printf("Error finding managed cluster '%s': %v", clusterName, err)
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Could not find managed cluster: %v", err)})
		return
	}

	// Get the current labels
	labels, found, err := unstructured.NestedMap(cluster.Object, "metadata", "labels")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error extracting labels: %v", err)})
		return
	}

	if !found || labels == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No labels found on cluster"})
		return
	}

	// Check if the specified label exists
	if _, exists := labels[labelKey]; !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Label not found on cluster"})
		return
	}

	// Remove the label
	delete(labels, labelKey)

	// Update the labels in the unstructured object
	err = unstructured.SetNestedMap(cluster.Object, labels, "metadata", "labels")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error updating labels: %v", err)})
		return
	}

	// Update the resource using dynamic client
	_, err = dynamicClient.Resource(managedClusterGVR).Update(context.TODO(), cluster, metav1.UpdateOptions{})
	if err != nil {
		log.Printf("Error updating managed cluster '%s': %v", clusterName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to delete label: %v", err)})
		return
	}

	log.Printf("AUDIT: Successfully deleted label '%s' from cluster '%s' in context '%s'", labelKey, clusterName, contextName)

	c.JSON(http.StatusOK, gin.H{
		"message": "Label deleted successfully",
		"label":   labelKey,
		"cluster": clusterName,
	})
}

// isProtectedLabel checks if a label is protected and should not be deleted
func isProtectedLabel(label string) bool {
	// Define protected label patterns
	if label == "cluster.open-cluster-management.io/clusterset" {
		return true
	}

	if strings.HasPrefix(label, "feature.open-cluster-management.io/addon-") {
		return true
	}

	// Add other protected labels as needed
	return false
}

// isLabelUsedInBindingPolicy checks if a label is being used in any binding policy
func isLabelUsedInBindingPolicy(labelKey string, clusterName string) bool {
	// Get the BP client to check binding policies
	bpClient, err := getBpClient()
	if err != nil {
		log.Printf("Error getting BP client: %v", err)
		return false // If we can't check, err on the side of caution
	}

	// List all binding policies
	bpList, err := bpClient.BindingPolicies().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		log.Printf("Error listing binding policies: %v", err)
		return false
	}

	// Check each policy to see if it uses this label key in its cluster selectors
	for _, bp := range bpList.Items {
		for _, selector := range bp.Spec.ClusterSelectors {
			if selector.MatchLabels != nil {
				// If any policy uses this label key as a selector, it's in use
				if _, exists := selector.MatchLabels[labelKey]; exists {
					log.Printf("Label '%s' is used in binding policy '%s'", labelKey, bp.Name)
					return true
				}
			}
		}
	}

	return false
}

// Helper function to get binding policy client
func getBpClient() (*bpv1alpha1.ControlV1alpha1Client, error) {
	// Reuse the existing client setup logic from bp package
	// You may need to adapt this based on your project structure
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("loading kubeconfig: %v", err)
	}

	// Use wds1 context by default or current context
	wdsContext := "wds1"
	if _, exists := config.Contexts[wdsContext]; !exists {
		wdsContext = config.CurrentContext
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*config,
		wdsContext,
		&clientcmd.ConfigOverrides{},
		nil,
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("getting client config: %v", err)
	}

	// Create BP client
	return bpv1alpha1.NewForConfig(restConfig)
}

// Add this endpoint to check which labels are used in binding policies

func GetBindingPolicyLabels(c *gin.Context) {
	contextName := c.Param("context")
	clusterName := c.Param("cluster")

	if contextName == "" || clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing context or cluster name"})
		return
	}

	// Get the cluster's current labels
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error loading kubeconfig: %v", err)})
		return
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*config,
		contextName,
		&clientcmd.ConfigOverrides{},
		nil,
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error getting client config: %v", err)})
		return
	}

	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creating dynamic client: %v", err)})
		return
	}

	// Get the ManagedCluster to get its labels
	managedClusterGVR := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	cluster, err := dynamicClient.Resource(managedClusterGVR).Get(context.TODO(), clusterName, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Could not find managed cluster: %v", err)})
		return
	}

	// Get the current labels
	labels, found, err := unstructured.NestedMap(cluster.Object, "metadata", "labels")
	if err != nil || !found || labels == nil {
		c.JSON(http.StatusOK, gin.H{"labels": []string{}})
		return
	}

	// Check which labels are used in binding policies
	bindingPolicyLabels := []string{}

	for key := range labels {
		if isLabelUsedInBindingPolicy(key, clusterName) {
			bindingPolicyLabels = append(bindingPolicyLabels, key)
		}
	}

	c.JSON(http.StatusOK, gin.H{"labels": bindingPolicyLabels})
}
