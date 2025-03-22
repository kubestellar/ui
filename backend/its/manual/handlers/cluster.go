package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// ---------------------------
// Data Structures
// ---------------------------

// ManagedClusterInfo holds details about a managed (imported) cluster.
type ManagedClusterInfo struct {
	Name         string            `json:"name"`
	Labels       map[string]string `json:"labels"`
	CreationTime time.Time         `json:"creationTime"`
	Context      string            `json:"context,omitempty"`
}

// ContextInfo holds basic info for a kubeconfig context.
type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

// ---------------------------
// Utility Functions
// ---------------------------

// HomeDir returns the user's home directory.
func HomeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // for Windows
}

func kubeconfigPath() string {
	if path := os.Getenv("KUBECONFIG"); path != "" {
		return path
	}
	return fmt.Sprintf("%s/.kube/config", HomeDir())
}

func GetITSInfo() ([]ManagedClusterInfo, error) {
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	var managedClusters []ManagedClusterInfo

	// Check all contexts that might be hub clusters
	for contextName := range config.Contexts {
		if !strings.HasPrefix(contextName, "its") {
			continue
		}

		clientConfig := clientcmd.NewNonInteractiveClientConfig(
			*config,
			contextName,
			&clientcmd.ConfigOverrides{},
			nil,
		)

		restConfig, err := clientConfig.ClientConfig()
		if err != nil {
			log.Printf("Skipping context %s: %v", contextName, err)
			continue
		}

		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			log.Printf("Error creating clientset for %s: %v", contextName, err)
			continue
		}

		clustersBytes, err := clientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			DoRaw(context.TODO())

		if err != nil {
			log.Printf("Error fetching clusters from %s: %v", contextName, err)
			continue
		}

		var clusterList struct {
			Items []struct {
				Metadata struct {
					Name              string            `json:"name"`
					Labels            map[string]string `json:"labels"`
					CreationTimestamp string            `json:"creationTimestamp"`
				} `json:"metadata"`
			} `json:"items"`
		}

		if err := json.Unmarshal(clustersBytes, &clusterList); err != nil {
			log.Printf("Error unmarshaling clusters: %v", err)
			continue
		}

		for _, item := range clusterList.Items {
			creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
			managedClusters = append(managedClusters, ManagedClusterInfo{
				Name:         item.Metadata.Name,
				Labels:       item.Metadata.Labels,
				CreationTime: creationTime,
				Context:      contextName,
			})
		}
	}

	return managedClusters, nil
}

// GetAvailableClusters reads the kubeconfig and returns a slice of ContextInfo
// for clusters that do NOT match the "*-kubeflex" pattern and are not already imported into ITS.
// It normalizes the underlying cluster name (stripping "k3d-" prefix) before filtering.
// GetAvailableClusters reads the kubeconfig and returns available clusters
func GetAvailableClusters() ([]ContextInfo, error) {
	kubeconfig := kubeconfigPath()
	log.Printf("Using kubeconfig: %s", kubeconfig)

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	// Get managed clusters from OCM
	managedClusters, err := GetITSInfo()
	if err != nil {
		log.Printf("Error retrieving managed clusters: %v", err)
		managedClusters = []ManagedClusterInfo{}
	}

	// Build lookup map with multiple variations
	managedSet := make(map[string]bool)
	for _, mc := range managedClusters {
		baseName := strings.ToLower(mc.Name)
		managedSet[baseName] = true

		// Add common prefix variations to the managed set
		managedSet["k3d-"+baseName] = true
		managedSet["kind-"+baseName] = true
		managedSet[strings.ToLower(mc.Name+"-kubeflex")] = true
	}

	var available []ContextInfo
	for ctxName, ctx := range config.Contexts {
		lowerCtxName := strings.ToLower(ctxName)
		lowerCluster := strings.ToLower(ctx.Cluster)

		// Skip system contexts
		if strings.HasPrefix(lowerCtxName, "its") ||
			strings.HasPrefix(lowerCtxName, "wds") ||
			strings.HasPrefix(lowerCtxName, "ar") {
			continue
		}

		// Check all possible naming variations
		if managedSet[lowerCtxName] ||
			managedSet[lowerCluster] ||
			managedSet[strings.TrimPrefix(lowerCluster, "k3d-")] ||
			managedSet[strings.TrimPrefix(lowerCluster, "kind-")] {
			continue
		}

		available = append(available, ContextInfo{
			Name:    ctxName,
			Cluster: ctx.Cluster,
		})
	}

	return available, nil
}

// GetAvailableClustersHandler handles the GET /api/cluster/available endpoint.
// It returns a filtered list of available clusters (contexts) from the kubeconfig.
func GetAvailableClustersHandler(c *gin.Context) {
	available, err := GetAvailableClusters()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, available)
}

// GetKubeInfoHandler handles the GET /api/clusters endpoint.
// It returns detailed information including contexts, a unique list of clusters,
// the current kubeconfig context, and ITS managed cluster data.
func GetKubeInfoHandler(c *gin.Context) {
	contexts, clusters, currentContext, err, itsData := GetKubeInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"contexts":       contexts,
		"clusters":       clusters,
		"currentContext": currentContext,
		"itsData":        itsData,
	})
}

// GetKubeInfo collects detailed kubeconfig information:
// - ITS contexts (e.g., those starting with "its")
// - Unique cluster names (from contexts ending with "-kubeflex")
// - The current kubeconfig context
// - ITS managed cluster data
func GetKubeInfo() ([]ContextInfo, []string, string, error, []ManagedClusterInfo) {
	kubeconfig := kubeconfigPath()
	// Log which kubeconfig is being used.
	if os.Getenv("KUBECONFIG") == "" {
		log.Printf("Using default kubeconfig path: %s", kubeconfig)
	} else {
		log.Printf("Using kubeconfig from environment: %s", kubeconfig)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, "", err, nil
	}

	var contexts []ContextInfo
	clusterSet := make(map[string]bool)
	currentContext := config.CurrentContext
	var managedClusters []ManagedClusterInfo

	// Process ITS contexts (e.g., contexts starting with "its")
	for contextName := range config.Contexts {
		if strings.HasPrefix(contextName, "its") {
			log.Printf("Processing ITS context: %s", contextName)
			clientConfig := clientcmd.NewNonInteractiveClientConfig(
				*config,
				contextName,
				&clientcmd.ConfigOverrides{},
				clientcmd.NewDefaultClientConfigLoadingRules(),
			)
			restConfig, err := clientConfig.ClientConfig()
			if err != nil {
				log.Printf("Error creating REST config for context %s: %v", contextName, err)
				continue
			}
			clientset, err := kubernetes.NewForConfig(restConfig)
			if err != nil {
				log.Printf("Error creating clientset for context %s: %v", contextName, err)
				continue
			}
			clustersBytes, err := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				DoRaw(context.TODO())
			if err != nil {
				log.Printf("Error fetching managed clusters from context %s: %v", contextName, err)
				continue
			}
			var clusterList struct {
				Items []struct {
					Metadata struct {
						Name              string            `json:"name"`
						Labels            map[string]string `json:"labels"`
						CreationTimestamp string            `json:"creationTimestamp"`
					} `json:"metadata"`
				} `json:"items"`
			}
			if err := json.Unmarshal(clustersBytes, &clusterList); err != nil {
				log.Printf("Error unmarshaling clusters from context %s: %v", contextName, err)
				continue
			}
			for _, item := range clusterList.Items {
				creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
				managedClusters = append(managedClusters, ManagedClusterInfo{
					Name:         item.Metadata.Name,
					Labels:       item.Metadata.Labels,
					CreationTime: creationTime,
					Context:      contextName,
				})
			}
		}
	}

	// Process contexts with "-kubeflex" suffix.
	for contextName, ctx := range config.Contexts {
		if strings.HasSuffix(contextName, "-kubeflex") {
			contexts = append(contexts, ContextInfo{
				Name:    contextName,
				Cluster: ctx.Cluster,
			})
			clusterSet[ctx.Cluster] = true
		}
	}

	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}

	return contexts, clusters, currentContext, nil, managedClusters
}
