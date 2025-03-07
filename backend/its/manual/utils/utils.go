package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

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

	// Query the managedclusters resource from the hub.
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
			Name:         item.Metadata.Name,
			Labels:       item.Metadata.Labels,
			CreationTime: creationTime,
		})
	}
	return managedClusters, nil
}

// GetAvailableClusters reads the kubeconfig and returns a slice of ContextInfo for clusters
// that do NOT match the "*-kubeflex" pattern and are not already imported into ITS.
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

	// Retrieve already imported clusters.
	importedClusters, err := GetITSInfo()
	if err != nil {
		log.Printf("Error retrieving ITS info: %v", err)
		importedClusters = []ManagedClusterInfo{}
	}
	importedSet := make(map[string]bool)
	for _, ic := range importedClusters {
		importedSet[ic.Name] = true
	}

	var availableContexts []ContextInfo
	for contextName, ctx := range config.Contexts {
		// Skip contexts that contain "-kubeflex".
		if strings.Contains(contextName, "-kubeflex") {
			continue
		}
		// Skip contexts whose underlying cluster is already imported.
		if importedSet[ctx.Cluster] {
			continue
		}
		availableContexts = append(availableContexts, ContextInfo{
			Name:    contextName,
			Cluster: ctx.Cluster,
		})
	}

	return availableContexts, nil
}
