package k8s

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/telemetry"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"os"
)

// ClusterMetrics represents the resource usage metrics for a cluster
type ClusterMetrics struct {
	ClusterName    string  `json:"clusterName"`
	CPUUsage       float64 `json:"cpuUsage"`       // Percentage of CPU usage
	MemoryUsage    float64 `json:"memoryUsage"`    // Percentage of Memory usage
	TotalCPU       string  `json:"totalCPU"`       // Total CPU capacity
	TotalMemory    string  `json:"totalMemory"`    // Total Memory capacity
	UsedCPU        string  `json:"usedCPU"`        // Used CPU
	UsedMemory     string  `json:"usedMemory"`     // Used Memory
	NodeCount      int     `json:"nodeCount"`      // Number of nodes
	Timestamp      string  `json:"timestamp"`
	Error          string  `json:"error,omitempty"`
}

// ClusterMetricsResponse represents the response for cluster metrics
type ClusterMetricsResponse struct {
	Clusters       []ClusterMetrics `json:"clusters"`
	OverallCPU     float64          `json:"overallCPU"`     // Overall CPU usage across all clusters
	OverallMemory  float64          `json:"overallMemory"`  // Overall Memory usage across all clusters
	TotalClusters  int              `json:"totalClusters"`
	ActiveClusters int              `json:"activeClusters"`
	Timestamp      string           `json:"timestamp"`
}

// GetClusterMetrics retrieves CPU and Memory usage metrics for all clusters
func GetClusterMetrics(c *gin.Context) {
	// Load kubeconfig
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		home := os.Getenv("HOME")
		if home == "" {
			home = os.Getenv("USERPROFILE") // Windows
		}
		kubeconfig = fmt.Sprintf("%s/.kube/config", home)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClusterMetrics", "load_kubeconfig", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to load kubeconfig",
			"details": err.Error(),
		})
		return
	}

	// Deduplicate clusters by server address
	uniqueClusters := make(map[string]string) // server -> contextName
	for contextName, ctx := range config.Contexts {
		cluster := config.Clusters[ctx.Cluster]
		if cluster == nil {
			continue
		}
		server := cluster.Server
		if _, exists := uniqueClusters[server]; !exists {
			uniqueClusters[server] = contextName
		}
	}

	var allMetrics []ClusterMetrics
	var totalCPUUsage, totalMemoryUsage float64
	var activeClusters int

	// Iterate through unique clusters only
	for server, contextName := range uniqueClusters {
		log.LogDebug("Getting metrics for context", zap.String("context", contextName), zap.String("server", server))

		clientset, _, err := GetClientSetWithContext(contextName)
		if err != nil {
			log.LogWarn("Failed to get client for context", zap.String("context", contextName), zap.Error(err))
			// Add error metric but continue with other clusters
			allMetrics = append(allMetrics, ClusterMetrics{
				ClusterName: contextName,
				Error:       fmt.Sprintf("Failed to connect to cluster: %v", err),
				Timestamp:   time.Now().Format(time.RFC3339),
			})
			continue
		}

		metrics, err := getClusterResourceMetrics(clientset, contextName)
		if err != nil {
			log.LogWarn("Failed to get metrics for context", zap.String("context", contextName), zap.Error(err))
			allMetrics = append(allMetrics, ClusterMetrics{
				ClusterName: contextName,
				Error:       fmt.Sprintf("Failed to get metrics: %v", err),
				Timestamp:   time.Now().Format(time.RFC3339),
			})
			continue
		}

		allMetrics = append(allMetrics, metrics)

		// Only count clusters without errors in overall calculations
		if metrics.Error == "" {
			activeClusters++
			totalCPUUsage += metrics.CPUUsage
			totalMemoryUsage += metrics.MemoryUsage
		}
	}

	// Calculate overall metrics
	overallCPU := 0.0
	overallMemory := 0.0
	if activeClusters > 0 {
		overallCPU = totalCPUUsage / float64(activeClusters)
		overallMemory = totalMemoryUsage / float64(activeClusters)
	}

	response := ClusterMetricsResponse{
		Clusters:       allMetrics,
		OverallCPU:     overallCPU,
		OverallMemory:  overallMemory,
		TotalClusters:  len(uniqueClusters),
		ActiveClusters: activeClusters,
		Timestamp:      time.Now().Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

// getClusterResourceMetrics calculates resource usage for a specific cluster
func getClusterResourceMetrics(clientset *kubernetes.Clientset, clusterName string) (ClusterMetrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get all nodes
	nodes, err := clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return ClusterMetrics{}, fmt.Errorf("failed to list nodes: %v", err)
	}

	if len(nodes.Items) == 0 {
		return ClusterMetrics{}, fmt.Errorf("no nodes found in cluster")
	}

	var totalCPUCapacity, totalMemoryCapacity resource.Quantity
	var totalCPUUsage, totalMemoryUsage resource.Quantity

	// Calculate total capacity and usage from all nodes
	for _, node := range nodes.Items {
		// Get node capacity
		if cpuCapacity, exists := node.Status.Capacity[corev1.ResourceCPU]; exists {
			totalCPUCapacity.Add(cpuCapacity)
		}
		if memoryCapacity, exists := node.Status.Capacity[corev1.ResourceMemory]; exists {
			totalMemoryCapacity.Add(memoryCapacity)
		}

		// Get node allocatable (what's actually available for pods)
		// Note: We're using capacity for now, but could switch to allocatable for more accurate metrics
		_ = node.Status.Allocatable // Keep for future use
	}

	// Get pod resource usage by querying all pods across all namespaces
	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return ClusterMetrics{}, fmt.Errorf("failed to list namespaces: %v", err)
	}

	for _, namespace := range namespaces.Items {
		pods, err := clientset.CoreV1().Pods(namespace.Name).List(ctx, metav1.ListOptions{})
		if err != nil {
			continue // Skip namespaces we can't access
		}

		for _, pod := range pods.Items {
			// Only count running pods
			if pod.Status.Phase != corev1.PodRunning {
				continue
			}

			// Calculate resource requests for this pod
			for _, container := range pod.Spec.Containers {
				if cpuRequest, exists := container.Resources.Requests[corev1.ResourceCPU]; exists {
					totalCPUUsage.Add(cpuRequest)
				}
				if memoryRequest, exists := container.Resources.Requests[corev1.ResourceMemory]; exists {
					totalMemoryUsage.Add(memoryRequest)
				}
			}
		}
	}

	// Calculate percentages
	cpuUsagePercent := 0.0
	memoryUsagePercent := 0.0

	if totalCPUCapacity.Cmp(resource.Quantity{}) > 0 {
		cpuUsagePercent = (float64(totalCPUUsage.MilliValue()) / float64(totalCPUCapacity.MilliValue())) * 100
	}

	if totalMemoryCapacity.Cmp(resource.Quantity{}) > 0 {
		memoryUsagePercent = (float64(totalMemoryUsage.Value()) / float64(totalMemoryCapacity.Value())) * 100
	}

	// Format resource quantities for display
	formatCPU := func(q resource.Quantity) string {
		if q.MilliValue() >= 1000 {
			return fmt.Sprintf("%.1f cores", float64(q.MilliValue())/1000.0)
		}
		return fmt.Sprintf("%dm", q.MilliValue())
	}

	formatMemory := func(q resource.Quantity) string {
		bytes := q.Value()
		if bytes >= 1024*1024*1024 {
			return fmt.Sprintf("%.1f Gi", float64(bytes)/(1024*1024*1024))
		} else if bytes >= 1024*1024 {
			return fmt.Sprintf("%.1f Mi", float64(bytes)/(1024*1024))
		}
		return fmt.Sprintf("%d bytes", bytes)
	}

	return ClusterMetrics{
		ClusterName:   clusterName,
		CPUUsage:      cpuUsagePercent,
		MemoryUsage:   memoryUsagePercent,
		TotalCPU:      formatCPU(totalCPUCapacity),
		TotalMemory:   formatMemory(totalMemoryCapacity),
		UsedCPU:       formatCPU(totalCPUUsage),
		UsedMemory:    formatMemory(totalMemoryUsage),
		NodeCount:     len(nodes.Items),
		Timestamp:     time.Now().Format(time.RFC3339),
	}, nil
}

// GetClusterMetricsForContext retrieves metrics for a specific cluster context
func GetClusterMetricsForContext(c *gin.Context) {
	contextName := c.Param("context")
	if contextName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Context name is required"})
		return
	}

	log.LogInfo("Getting metrics for specific context", zap.String("context", contextName))

	clientset, _, err := GetClientSetWithContext(contextName)
	if err != nil {
		log.LogError("Failed to get client for context", zap.String("context", contextName), zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClusterMetricsForContext", "get_client", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to connect to cluster",
			"details": err.Error(),
		})
		return
	}

	metrics, err := getClusterResourceMetrics(clientset, contextName)
	if err != nil {
		log.LogError("Failed to get metrics for context", zap.String("context", contextName), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get cluster metrics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// parseResourceQuantity parses a resource quantity string and returns the numeric value
func parseResourceQuantity(quantityStr string) (float64, error) {
	// Remove common suffixes and convert to numeric value
	quantityStr = strings.TrimSpace(quantityStr)
	
	// Handle CPU values (e.g., "100m", "1", "2.5")
	if strings.HasSuffix(quantityStr, "m") {
		value, err := strconv.ParseFloat(strings.TrimSuffix(quantityStr, "m"), 64)
		if err != nil {
			return 0, err
		}
		return value / 1000.0, nil // Convert millicores to cores
	}
	
	// Handle plain numeric values (assumed to be cores)
	value, err := strconv.ParseFloat(quantityStr, 64)
	if err != nil {
		return 0, err
	}
	
	return value, nil
}

// parseMemoryQuantity parses a memory quantity string and returns the numeric value in bytes
func parseMemoryQuantity(quantityStr string) (int64, error) {
	quantityStr = strings.TrimSpace(quantityStr)
	
	// Handle different memory units
	if strings.HasSuffix(quantityStr, "Ki") {
		value, err := strconv.ParseInt(strings.TrimSuffix(quantityStr, "Ki"), 10, 64)
		if err != nil {
			return 0, err
		}
		return value * 1024, nil
	}
	
	if strings.HasSuffix(quantityStr, "Mi") {
		value, err := strconv.ParseInt(strings.TrimSuffix(quantityStr, "Mi"), 10, 64)
		if err != nil {
			return 0, err
		}
		return value * 1024 * 1024, nil
	}
	
	if strings.HasSuffix(quantityStr, "Gi") {
		value, err := strconv.ParseInt(strings.TrimSuffix(quantityStr, "Gi"), 10, 64)
		if err != nil {
			return 0, err
		}
		return value * 1024 * 1024 * 1024, nil
	}
	
	// Assume bytes if no suffix
	value, err := strconv.ParseInt(quantityStr, 10, 64)
	if err != nil {
		return 0, err
	}
	
	return value, nil
} 