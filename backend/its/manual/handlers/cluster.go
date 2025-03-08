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

// GetITSInfo retrieves clusters already imported into ITS by querying the managedclusters API.
func GetITSInfo() ([]ManagedClusterInfo, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = fmt.Sprintf("%s/.kube/config", HomeDir())
	}
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, err
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	clustersBytes, err := clientset.RESTClient().Get().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		DoRaw(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("failed to get managed clusters: %w", err)
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
		return nil, fmt.Errorf("failed to unmarshal clusters: %w", err)
	}

	var managedClusters []ManagedClusterInfo
	for _, item := range clusterList.Items {
		creationTime, err := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
		if err != nil {
			creationTime = time.Now().UTC()
		}
		managedClusters = append(managedClusters, ManagedClusterInfo{
			Name:         item.Metadata.Name, // ITS inventory uses this as the unique NAME.
			Labels:       item.Metadata.Labels,
			CreationTime: creationTime,
		})
	}
	return managedClusters, nil
}

// GetAvailableClusters reads the kubeconfig and returns a slice of ContextInfo
// for clusters that do NOT match the "*-kubeflex" pattern and are not already imported into ITS.
// It normalizes the underlying cluster name (stripping "k3d-" prefix) before filtering.
func GetAvailableClusters() ([]ContextInfo, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = fmt.Sprintf("%s/.kube/config", HomeDir())
		log.Printf("Using default kubeconfig path: %s", kubeconfig)
	} else {
		log.Printf("Using kubeconfig from environment: %s", kubeconfig)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	importedClusters, err := GetITSInfo()
	if err != nil {
		log.Printf("Error retrieving ITS info: %v", err)
		importedClusters = []ManagedClusterInfo{}
	}
	// Build a set of imported cluster names (using the ITS "Name" field)
	importedSet := make(map[string]bool)
	for _, ic := range importedClusters {
		importedSet[ic.Name] = true
	}

	var availableContexts []ContextInfo
	for contextName, ctx := range config.Contexts {
		// Skip contexts that contain "-kubeflex"
		if strings.Contains(contextName, "-kubeflex") {
			continue
		}
		// Normalize the underlying cluster name by removing a "k3d-" prefix if present.
		normalizedCluster := ctx.Cluster
		if strings.HasPrefix(normalizedCluster, "k3d-") {
			normalizedCluster = strings.TrimPrefix(normalizedCluster, "k3d-")
		}
		// Skip this context if the normalized cluster name is already imported.
		if importedSet[normalizedCluster] {
			continue
		}
		availableContexts = append(availableContexts, ContextInfo{
			Name:    contextName,
			Cluster: ctx.Cluster, // original value for display purposes
		})
	}

	return availableContexts, nil
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
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := HomeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", HomeDir())
		}
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
