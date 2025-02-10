package main

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

	"github.com/katamyra/kubestellarUI/api"
	"github.com/katamyra/kubestellarUI/wds/deployment"
)

type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

type ManagedClusterInfo struct {
	Name         string            `json:"name"`
	Labels       map[string]string `json:"labels"`
	CreationTime time.Time         `json:"creationTime"`
}

func main() {

	router := gin.Default()

	log.Println("Debug: KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/api/clusters", func(c *gin.Context) {
		contexts, clusters, currentContext, err, itsData := getKubeInfo()
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
	})

	router.POST("/clusters/onboard", api.OnboardClusterHandler)
	router.GET("/clusters/status", api.GetClusterStatusHandler)

	router.GET("/api/wds/workloads", func(c *gin.Context) {
		workloads, err := deployment.GetWDSWorkloads()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, workloads)
	})

	// New Log Endpoint
	router.GET("/api/log", func(c *gin.Context) {
		// Fetch Kubernetes Information
		contexts, clusters, currentContext, _, itsData := getKubeInfo()

		// Fetch WDS Workloads
		workloads, err := deployment.GetWDSWorkloads()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var logBuilder strings.Builder

		logBuilder.WriteString("==== KubestellarUI Log ====\n\n")

		logBuilder.WriteString(fmt.Sprintf("Current Context: %s\n\n", currentContext))

		logBuilder.WriteString("=== Clusters ===\n")
		for _, cluster := range clusters {
			logBuilder.WriteString(fmt.Sprintf("- %s\n", cluster))
		}

		logBuilder.WriteString("\n=== Contexts ===\n")
		for _, ctx := range contexts {
			logBuilder.WriteString(fmt.Sprintf("- %s (Cluster: %s)\n", ctx.Name, ctx.Cluster))
		}

		logBuilder.WriteString("\n=== ITS Data ===\n")
		for _, cluster := range itsData {
			logBuilder.WriteString(fmt.Sprintf("- Name: %s\n", cluster.Name))
			logBuilder.WriteString("  Labels:\n")
			for key, value := range cluster.Labels {
				logBuilder.WriteString(fmt.Sprintf("    %s=%s\n", key, value))
			}
			logBuilder.WriteString(fmt.Sprintf("  Creation Time: %s\n", cluster.CreationTime))
		}

		logBuilder.WriteString("\n=== WDS Workloads ===\n")
		for _, workload := range workloads {
			logBuilder.WriteString(fmt.Sprintf("- Name: %s\n", workload.Name))
			logBuilder.WriteString(fmt.Sprintf("  Kind: %s\n", workload.Kind))
			logBuilder.WriteString(fmt.Sprintf("  Namespace: %s\n", workload.Namespace))
			logBuilder.WriteString(fmt.Sprintf("  Creation Time: %s\n\n", workload.CreationTime))
		}

		// Set Headers for File Download
		c.Header("Content-Type", "text/plain")
		c.Header("Content-Disposition", "attachment; filename=kubestellarui.log")

		// Send the Log String
		c.String(http.StatusOK, logBuilder.String())
	})

	// Route to CRUD deployment
	router.POST("/api/wds/create", deployment.CreateDeployment)
	router.PUT("/api/wds/update", deployment.UpdateDeployment)
	router.DELETE("/api/wds/delete", deployment.DeleteDeployment)
	router.GET("/api/wds/:name", deployment.GetDeploymentByName)
	router.GET("/api/wds/status", deployment.GetDeploymentStatus)
	// websocket
	router.GET("/ws", func(ctx *gin.Context) {
		deployment.HandleDeploymentLogs(ctx.Writer, ctx.Request)
	})
	router.Run(":4000")
}

func getKubeInfo() ([]ContextInfo, []string, string, error, []ManagedClusterInfo) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
		log.Printf("Using default kubeconfig path: %s", kubeconfig)
	} else {
		log.Printf("Using kubeconfig from enviorment: %s", kubeconfig)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, "", err, nil
	}

	var contexts []ContextInfo
	clusterSet := make(map[string]bool)

	// First, get the its1 context to fetch managed clusters
	var its1Context string
	for contextName := range config.Contexts {
		if strings.Contains(contextName, "its1") {
			its1Context = contextName
			break
		}
	}

	// Get managed clusters from its1
	var managedClusters []ManagedClusterInfo
	if its1Context != "" {
		// Use its1Context to get the managed clusters
		config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, nil, "", err, nil
		}

		clientset, err := kubernetes.NewForConfig(config)
		if err != nil {
			return nil, nil, "", err, nil
		}

		// Get managed clusters from its1
		clustersBytes, err := clientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			DoRaw(context.TODO())
		if err != nil {
			fmt.Printf("Error getting managed clusters: %v\n", err)
			// Continue with empty managed clusters list
		} else {
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
				fmt.Printf("Error unmarshaling clusters: %v\n", err)
			} else {
				for _, item := range clusterList.Items {
					creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
					managedClusters = append(managedClusters, ManagedClusterInfo{
						Name:         item.Metadata.Name,
						Labels:       item.Metadata.Labels,
						CreationTime: creationTime,
					})
				}
			}
		}
	}

	// Now get the kubeflex contexts
	for contextName, context := range config.Contexts {
		if strings.HasSuffix(contextName, "-kubeflex") {
			contexts = append(contexts, ContextInfo{
				Name:    contextName,
				Cluster: context.Cluster,
			})
			clusterSet[context.Cluster] = true
		}
	}

	// Convert unique clusters to slice
	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}

	return contexts, clusters, config.CurrentContext, nil, managedClusters
}

func getITSInfo() ([]ManagedClusterInfo, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
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
		managedClusters = append(managedClusters, ManagedClusterInfo{
			Name:         item.Metadata.Name,
			Labels:       item.Metadata.Labels,
			CreationTime: time.Now().UTC(),
		})
	}

	return managedClusters, nil
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
