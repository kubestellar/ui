package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

// ManagedClusterCondition represents a condition of a managed cluster
type ManagedClusterCondition struct {
	LastTransitionTime metav1.Time `json:"lastTransitionTime,omitempty"`
	Message            string      `json:"message,omitempty"`
	Reason             string      `json:"reason,omitempty"`
	Status             string      `json:"status,omitempty"`
	Type               string      `json:"type,omitempty"`
}

// ManagedClusterStatus represents the status of a managed cluster
type ManagedClusterStatus struct {
	Conditions []ManagedClusterCondition `json:"conditions,omitempty"`
	Version    map[string]string         `json:"version,omitempty"`
	Capacity   map[string]string         `json:"capacity,omitempty"`
}

// ManagedClusterInfo contains key information about a managed cluster
type ManagedClusterInfo struct {
	Name              string               `json:"name"`
	UID               string               `json:"uid"`
	CreationTimestamp time.Time            `json:"creationTimestamp"`
	Labels            map[string]string    `json:"labels,omitempty"`
	Status            ManagedClusterStatus `json:"status,omitempty"`
	Available         bool                 `json:"available"`
	Joined            bool                 `json:"joined"`
}

// GetManagedClustersHandler returns a list of all managed clusters
func GetManagedClustersHandler(c *gin.Context) {
	// Get the hub context
	hubContext := c.DefaultQuery("context", "its1")

	// Get client config for the hub
	_, restConfig, err := k8s.GetClientSetWithConfigContext(hubContext)
	if err != nil {
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to create client: %v", err),
		})
		return
	}

	// Create dynamic client from config
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to create dynamic client: %v", err),
		})
		return
	}

	// Define the GVR for ManagedCluster resource
	managedClusterGVR := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	// List all managed clusters
	clusters, err := listManagedClusters(dynamicClient, managedClusterGVR)
	if err != nil {
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to list managed clusters: %v", err),
		})
		return
	}

	c.JSON(200, gin.H{
		"clusters": clusters,
		"count":    len(clusters),
	})
}

// GetManagedClusterHandler returns details of a specific managed cluster
func GetManagedClusterHandler(c *gin.Context) {
	clusterName := c.Param("name")
	if clusterName == "" {
		c.JSON(400, gin.H{
			"error": "Cluster name is required",
		})
		return
	}

	// Get the hub context
	hubContext := c.DefaultQuery("context", "its1")

	// Get client config for the hub
	_, restConfig, err := k8s.GetClientSetWithConfigContext(hubContext)
	if err != nil {
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to create client: %v", err),
		})
		return
	}

	// Create dynamic client from config
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		c.JSON(500, gin.H{
			"error": fmt.Sprintf("Failed to create dynamic client: %v", err),
		})
		return
	}

	// Define the GVR for ManagedCluster resource
	managedClusterGVR := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	// Get the managed cluster
	cluster, err := getManagedCluster(dynamicClient, managedClusterGVR, clusterName)
	if err != nil {
		c.JSON(404, gin.H{
			"error": fmt.Sprintf("Failed to get managed cluster: %v", err),
		})
		return
	}

	c.JSON(200, cluster)
}

// listManagedClusters uses the dynamic client to list all managed clusters
func listManagedClusters(client dynamic.Interface, gvr schema.GroupVersionResource) ([]ManagedClusterInfo, error) {
	// List all managed clusters
	list, err := client.Resource(gvr).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list managed clusters: %w", err)
	}

	// Extract relevant information from each managed cluster
	var clusters []ManagedClusterInfo
	for _, item := range list.Items {
		cluster, err := extractClusterInfo(&item)
		if err != nil {
			log.Printf("Warning: Failed to extract cluster info: %v", err)
			continue
		}
		clusters = append(clusters, cluster)
	}

	return clusters, nil
}

// getManagedCluster uses the dynamic client to get a specific managed cluster
func getManagedCluster(client dynamic.Interface, gvr schema.GroupVersionResource, name string) (*ManagedClusterInfo, error) {
	// Get the managed cluster
	cluster, err := client.Resource(gvr).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get managed cluster: %w", err)
	}

	// Extract relevant information
	clusterInfo, err := extractClusterInfo(cluster)
	if err != nil {
		return nil, fmt.Errorf("failed to extract cluster info: %w", err)
	}

	return &clusterInfo, nil
}

// extractClusterInfo extracts relevant information from an unstructured managed cluster
func extractClusterInfo(obj *unstructured.Unstructured) (ManagedClusterInfo, error) {
	cluster := ManagedClusterInfo{
		Name:              obj.GetName(),
		UID:               string(obj.GetUID()),
		CreationTimestamp: obj.GetCreationTimestamp().Time,
		Labels:            obj.GetLabels(),
		Available:         false,
		Joined:            false,
	}

	// Extract status conditions
	conditions, found, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil {
		return cluster, fmt.Errorf("failed to get status conditions: %w", err)
	}

	if found {
		// Convert conditions to proper type
		conditionsJSON, err := json.Marshal(conditions)
		if err != nil {
			return cluster, fmt.Errorf("failed to marshal conditions: %w", err)
		}

		var clusterConditions []ManagedClusterCondition
		if err := json.Unmarshal(conditionsJSON, &clusterConditions); err != nil {
			return cluster, fmt.Errorf("failed to unmarshal conditions: %w", err)
		}

		cluster.Status.Conditions = clusterConditions

		// Check for available and joined conditions
		for _, condition := range clusterConditions {
			if condition.Type == "ManagedClusterConditionAvailable" && condition.Status == "True" {
				cluster.Available = true
			}
			if condition.Type == "ManagedClusterJoined" && condition.Status == "True" {
				cluster.Joined = true
			}
		}
	}

	// Extract version info
	version, found, err := unstructured.NestedMap(obj.Object, "status", "version")
	if err != nil {
		return cluster, fmt.Errorf("failed to get version info: %w", err)
	}

	if found {
		versionMap := make(map[string]string)
		for k, v := range version {
			versionMap[k] = fmt.Sprintf("%v", v)
		}
		cluster.Status.Version = versionMap
	}

	// Extract capacity info
	capacity, found, err := unstructured.NestedMap(obj.Object, "status", "capacity")
	if err != nil {
		return cluster, fmt.Errorf("failed to get capacity info: %w", err)
	}

	if found {
		capacityMap := make(map[string]string)
		for k, v := range capacity {
			capacityMap[k] = fmt.Sprintf("%v", v)
		}
		cluster.Status.Capacity = capacityMap
	}

	return cluster, nil
}
