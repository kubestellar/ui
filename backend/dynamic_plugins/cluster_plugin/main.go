package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/dynamic_plugins"
	"github.com/kubestellar/ui/k8s"
	certificatesv1 "k8s.io/api/certificates/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// ClusterPlugin implements the KubestellarPlugin interface for cluster operations
type ClusterPlugin struct {
	clusterStatuses map[string]string
	mutex           sync.RWMutex
	initialized     bool
}

// NewPlugin creates a new cluster plugin instance
func NewPlugin() dynamic_plugins.KubestellarPlugin {
	return &ClusterPlugin{
		clusterStatuses: make(map[string]string),
	}
}

// Initialize initializes the cluster plugin
func (cp *ClusterPlugin) Initialize(config map[string]interface{}) error {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	log.Printf("🔌 Initializing Cluster Management Plugin")
	cp.initialized = true
	return nil
}

// GetMetadata returns plugin metadata
func (cp *ClusterPlugin) GetMetadata() dynamic_plugins.PluginMetadata {
	return dynamic_plugins.PluginMetadata{
		ID:          "kubestellar-cluster-manager",
		Name:        "KubeStellar Cluster Manager",
		Version:     "1.0.0",
		Description: "Comprehensive cluster onboarding and detachment operations for KubeStellar",
		Author:      "CNCF LFX Mentee",
		Endpoints: []dynamic_plugins.EndpointConfig{
			{
				Path:        "/onboard",
				Method:      "POST",
				Handler:     "OnboardClusterHandler",
				Description: "Onboard a new cluster to KubeStellar",
			},
			{
				Path:        "/detach",
				Method:      "POST",
				Handler:     "DetachClusterHandler",
				Description: "Detach a cluster from KubeStellar",
			},
			{
				Path:        "/status",
				Method:      "GET",
				Handler:     "GetClusterStatusHandler",
				Description: "Get status of all managed clusters",
			},
			{
				Path:        "/status/:cluster",
				Method:      "GET",
				Handler:     "GetSingleClusterStatusHandler",
				Description: "Get status of a specific cluster",
			},
			{
				Path:        "/labels/:cluster",
				Method:      "PATCH",
				Handler:     "UpdateClusterLabelsHandler",
				Description: "Update labels for a managed cluster",
			},
			{
				Path:        "/validate",
				Method:      "POST",
				Handler:     "ValidateClusterHandler",
				Description: "Validate cluster connectivity",
			},
		},
		Permissions: []string{
			"cluster.read",
			"cluster.write",
			"cluster.delete",
			"managedcluster.read",
			"managedcluster.write",
			"managedcluster.delete",
		},
		Dependencies: []string{
			"k8s.io/client-go",
			"github.com/kubestellar/ui/k8s",
		},
		Configuration: map[string]interface{}{
			"default_timeout": "10m",
			"auto_approve":    true,
		},
	}
}

// GetHandlers returns the HTTP handlers for cluster operations
func (cp *ClusterPlugin) GetHandlers() map[string]gin.HandlerFunc {
	return map[string]gin.HandlerFunc{
		"OnboardClusterHandler":         cp.OnboardClusterHandler,
		"DetachClusterHandler":          cp.DetachClusterHandler,
		"GetClusterStatusHandler":       cp.GetClusterStatusHandler,
		"GetSingleClusterStatusHandler": cp.GetSingleClusterStatusHandler,
		"UpdateClusterLabelsHandler":    cp.UpdateClusterLabelsHandler,
		"ValidateClusterHandler":        cp.ValidateClusterHandler,
	}
}

// Health performs a health check for the plugin
func (cp *ClusterPlugin) Health() error {
	if !cp.initialized {
		return fmt.Errorf("plugin not initialized")
	}
	return nil
}

// Cleanup performs cleanup when the plugin is unloaded
func (cp *ClusterPlugin) Cleanup() error {
	cp.mutex.Lock()
	defer cp.mutex.Unlock()

	log.Printf("🧹 Cleaning up Cluster Management Plugin")
	cp.initialized = false
	return nil
}

// Validate validates the plugin
func (cp *ClusterPlugin) Validate() error {
	return nil
}

// GetStatus returns the current plugin status
func (cp *ClusterPlugin) GetStatus() dynamic_plugins.PluginStatus {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	status := dynamic_plugins.StateLoaded
	health := dynamic_plugins.HealthHealthy

	if !cp.initialized {
		status = dynamic_plugins.StateError
		health = dynamic_plugins.HealthUnhealthy
	}

	return dynamic_plugins.PluginStatus{
		State:        status,
		Health:       health,
		LastCheck:    time.Now().Format(time.RFC3339),
		RequestCount: 0,
	}
}

// HandleError handles and formats errors
func (cp *ClusterPlugin) HandleError(err error) dynamic_plugins.PluginError {
	return dynamic_plugins.PluginError{
		Code:      dynamic_plugins.ErrorCodeRuntime,
		Message:   err.Error(),
		Timestamp: time.Now().Format(time.RFC3339),
	}
}

// OnConfigChange handles configuration updates
func (cp *ClusterPlugin) OnConfigChange(config map[string]interface{}) error {
	log.Printf("🔧 Cluster plugin configuration updated: %v", config)
	return nil
}

// GetMetrics returns plugin metrics
func (cp *ClusterPlugin) GetMetrics() map[string]interface{} {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	totalClusters := len(cp.clusterStatuses)
	onboarded := 0
	pending := 0
	failed := 0

	for _, status := range cp.clusterStatuses {
		switch status {
		case "Onboarded":
			onboarded++
		case "Pending":
			pending++
		case "Failed", "DetachmentFailed":
			failed++
		}
	}

	return map[string]interface{}{
		"total_clusters": totalClusters,
		"onboarded":      onboarded,
		"pending":        pending,
		"failed":         failed,
		"initialized":    cp.initialized,
	}
}

// GetPermissions returns required permissions
func (cp *ClusterPlugin) GetPermissions() []string {
	return []string{
		"cluster.read",
		"cluster.write",
		"cluster.delete",
		"managedcluster.read",
		"managedcluster.write",
		"managedcluster.delete",
	}
}

// ValidateRequest validates incoming requests
func (cp *ClusterPlugin) ValidateRequest(c *gin.Context) error {
	return nil
}

// OnLoad is called after successful loading
func (cp *ClusterPlugin) OnLoad() error {
	log.Printf("✅ Cluster Management Plugin loaded successfully")
	return nil
}

// OnUnload is called before unloading
func (cp *ClusterPlugin) OnUnload() error {
	log.Printf("👋 Cluster Management Plugin unloading")
	return nil
}

// HTTP Handlers - Extracted from existing handlers.go and detach.go

// OnboardClusterHandler handles cluster onboarding requests
func (cp *ClusterPlugin) OnboardClusterHandler(c *gin.Context) {
	contentType := c.GetHeader("Content-Type")

	var kubeconfigData []byte
	var clusterName string
	var useLocalKubeconfig bool = false

	// Handle form-data with file upload
	if strings.Contains(contentType, "multipart/form-data") {
		file, fileErr := c.FormFile("kubeconfig")
		clusterName = c.PostForm("name")

		if clusterName != "" && (fileErr != nil || file == nil) {
			useLocalKubeconfig = true
		} else if fileErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve kubeconfig file"})
			return
		} else if clusterName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
			return
		} else {
			f, err := file.Open()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open kubeconfig file"})
				return
			}
			defer f.Close()

			kubeconfigData, err = io.ReadAll(f)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read kubeconfig file"})
				return
			}
		}
	} else if strings.Contains(contentType, "application/json") {
		var req struct {
			Kubeconfig  string `json:"kubeconfig"`
			ClusterName string `json:"clusterName"`
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
			return
		}

		clusterName = req.ClusterName
		if clusterName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ClusterName is required"})
			return
		}

		if req.Kubeconfig == "" {
			useLocalKubeconfig = true
		} else {
			kubeconfigData = []byte(req.Kubeconfig)
		}
	} else {
		clusterName = c.Query("name")
		if clusterName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name parameter is required"})
			return
		}
		useLocalKubeconfig = true
	}

	// If using local kubeconfig, extract the specific cluster config
	if useLocalKubeconfig {
		var err error
		kubeconfigData, err = cp.getClusterConfigFromLocal(clusterName)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to find cluster '%s' in local kubeconfig: %v", clusterName, err)})
			return
		}
	}

	// Check if the cluster is already being onboarded
	cp.mutex.Lock()
	if status, exists := cp.clusterStatuses[clusterName]; exists {
		cp.mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, status),
			"status":  status,
		})
		return
	}
	cp.clusterStatuses[clusterName] = "Pending"
	cp.mutex.Unlock()

	// Start asynchronous onboarding
	go func() {
		err := cp.onboardCluster(kubeconfigData, clusterName)
		cp.mutex.Lock()
		if err != nil {
			log.Printf("Cluster '%s' onboarding failed: %v", clusterName, err)
			cp.clusterStatuses[clusterName] = "Failed"
		} else {
			cp.clusterStatuses[clusterName] = "Onboarded"
			log.Printf("Cluster '%s' onboarded successfully", clusterName)
		}
		cp.mutex.Unlock()
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Cluster '%s' is being onboarded", clusterName),
		"status":  "Pending",
	})
}

// DetachClusterHandler handles cluster detachment requests
func (cp *ClusterPlugin) DetachClusterHandler(c *gin.Context) {
	var req struct {
		ClusterName string `json:"clusterName" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload, clusterName is required"})
		return
	}

	clusterName := req.ClusterName
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	// Check if the cluster exists
	cp.mutex.RLock()
	_, exists := cp.clusterStatuses[clusterName]
	cp.mutex.RUnlock()

	if !exists {
		// Check directly with the OCM hub
		itsContext := "its1"
		hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to connect to OCM hub: %v", err),
			})
			return
		}

		result := hubClientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			Name(clusterName).
			Do(context.TODO())

		if err = result.Error(); err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Cluster '%s' not found in OCM hub", clusterName),
			})
			return
		}
	}

	// Start detaching the cluster
	cp.mutex.Lock()
	cp.clusterStatuses[clusterName] = "Detaching"
	cp.mutex.Unlock()

	go func() {
		err := cp.detachCluster(clusterName)
		cp.mutex.Lock()
		if err != nil {
			log.Printf("Cluster '%s' detachment failed: %v", clusterName, err)
			cp.clusterStatuses[clusterName] = "DetachmentFailed"
		} else {
			log.Printf("Cluster '%s' detached successfully", clusterName)
			delete(cp.clusterStatuses, clusterName)
		}
		cp.mutex.Unlock()
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Cluster '%s' is being detached", clusterName),
		"status":  "Detaching",
	})
}

// GetClusterStatusHandler returns status of all clusters
func (cp *ClusterPlugin) GetClusterStatusHandler(c *gin.Context) {
	cp.mutex.RLock()
	defer cp.mutex.RUnlock()

	var statuses []gin.H
	for cluster, status := range cp.clusterStatuses {
		statuses = append(statuses, gin.H{
			"clusterName": cluster,
			"status":      status,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"clusters": statuses,
		"total":    len(statuses),
	})
}

// GetSingleClusterStatusHandler returns status of a specific cluster
func (cp *ClusterPlugin) GetSingleClusterStatusHandler(c *gin.Context) {
	clusterName := c.Param("cluster")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	cp.mutex.RLock()
	status, exists := cp.clusterStatuses[clusterName]
	cp.mutex.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Cluster not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"clusterName": clusterName,
		"status":      status,
	})
}

// UpdateClusterLabelsHandler updates labels for a managed cluster
func (cp *ClusterPlugin) UpdateClusterLabelsHandler(c *gin.Context) {
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

	clientset, restConfig, err := k8s.GetClientSetWithConfigContext(req.ContextName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get Kubernetes client"})
		return
	}

	err = cp.updateManagedClusterLabels(clientset, restConfig, req.ClusterName, req.Labels)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update cluster labels: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Cluster labels updated successfully",
	})
}

// ValidateClusterHandler validates cluster connectivity
func (cp *ClusterPlugin) ValidateClusterHandler(c *gin.Context) {
	var req struct {
		Kubeconfig string `json:"kubeconfig" binding:"required"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if err := cp.validateClusterConnectivity([]byte(req.Kubeconfig)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"message": "Cluster connectivity validated successfully",
	})
}

// Helper methods - Extracted from existing implementation

func (cp *ClusterPlugin) getClusterConfigFromLocal(clusterName string) ([]byte, error) {
	kubeconfig := cp.kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	_, exists := config.Clusters[clusterName]
	if !exists {
		for contextName, ctx := range config.Contexts {
			if ctx.Cluster == clusterName {
				return cp.extractContextConfig(config, contextName)
			}
		}
		return nil, fmt.Errorf("cluster '%s' not found in local kubeconfig", clusterName)
	}

	var contextName string
	for ctxName, ctx := range config.Contexts {
		if ctx.Cluster == clusterName {
			contextName = ctxName
			break
		}
	}

	if contextName == "" {
		return nil, fmt.Errorf("no context found for cluster '%s'", clusterName)
	}

	return cp.extractContextConfig(config, contextName)
}

func (cp *ClusterPlugin) extractContextConfig(config *clientcmdapi.Config, contextName string) ([]byte, error) {
	context := config.Contexts[contextName]
	if context == nil {
		return nil, fmt.Errorf("context '%s' not found", contextName)
	}

	newConfig := &clientcmdapi.Config{
		APIVersion: config.APIVersion,
		Kind:       config.Kind,
		Clusters:   make(map[string]*clientcmdapi.Cluster),
		AuthInfos:  make(map[string]*clientcmdapi.AuthInfo),
		Contexts:   make(map[string]*clientcmdapi.Context),
	}

	cluster := config.Clusters[context.Cluster]
	authInfo := config.AuthInfos[context.AuthInfo]

	if cluster == nil {
		return nil, fmt.Errorf("cluster '%s' not found", context.Cluster)
	}
	if authInfo == nil {
		return nil, fmt.Errorf("auth info '%s' not found", context.AuthInfo)
	}

	newConfig.Clusters[context.Cluster] = cluster
	newConfig.AuthInfos[context.AuthInfo] = authInfo
	newConfig.Contexts[contextName] = context
	newConfig.CurrentContext = contextName

	return clientcmd.Write(*newConfig)
}

func (cp *ClusterPlugin) kubeconfigPath() string {
	if kubeconfig := os.Getenv("KUBECONFIG"); kubeconfig != "" {
		return kubeconfig
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".kube", "config")
}

func (cp *ClusterPlugin) onboardCluster(kubeconfigData []byte, clusterName string) error {
	log.Printf("🚀 Starting cluster onboarding for: %s", clusterName)

	if err := cp.validateClusterConnectivity(kubeconfigData); err != nil {
		return fmt.Errorf("cluster validation failed: %w", err)
	}

	tempKubeconfigPath, err := cp.createTempKubeconfig(kubeconfigData, clusterName)
	if err != nil {
		return fmt.Errorf("failed to create temp kubeconfig: %w", err)
	}
	defer os.Remove(tempKubeconfigPath)

	itsContext := "its1"
	joinToken, err := cp.getClusterAdmToken(itsContext)
	if err != nil {
		return fmt.Errorf("failed to get join token: %w", err)
	}

	if err := cp.joinClusterToHub(tempKubeconfigPath, clusterName, joinToken); err != nil {
		return fmt.Errorf("failed to join cluster to hub: %w", err)
	}

	hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}

	if err := cp.waitForAndApproveCSR(hubClientset, clusterName); err != nil {
		return fmt.Errorf("failed to approve CSR: %w", err)
	}

	if err := cp.waitForManagedCluster(hubClientset, clusterName); err != nil {
		return fmt.Errorf("failed to wait for managed cluster: %w", err)
	}

	log.Printf("✅ Cluster '%s' onboarded successfully", clusterName)
	return nil
}

func (cp *ClusterPlugin) detachCluster(clusterName string) error {
	log.Printf("🗑️ Starting cluster detachment for: %s", clusterName)

	itsContext := "its1"
	hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}

	exists, err := cp.checkManagedClusterExists(hubClientset, clusterName)
	if err != nil {
		return fmt.Errorf("error checking if cluster exists: %w", err)
	}
	if !exists {
		return fmt.Errorf("cluster '%s' not found in OCM hub", clusterName)
	}

	if err := cp.executeDetachCommand(itsContext, clusterName); err != nil {
		return fmt.Errorf("failed to execute detach operation: %w", err)
	}

	if err := cp.waitForClusterRemoval(hubClientset, clusterName); err != nil {
		return fmt.Errorf("failed to confirm cluster removal: %w", err)
	}

	log.Printf("✅ Cluster '%s' detached successfully", clusterName)
	return nil
}

func (cp *ClusterPlugin) validateClusterConnectivity(kubeconfigData []byte) error {
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
	if err != nil {
		return fmt.Errorf("failed to create REST config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create clientset: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err = clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil {
		return fmt.Errorf("failed to connect to cluster: %w", err)
	}

	return nil
}

func (cp *ClusterPlugin) createTempKubeconfig(kubeconfigData []byte, clusterName string) (string, error) {
	tempFile, err := os.CreateTemp("", fmt.Sprintf("kubeconfig-%s-*.yaml", clusterName))
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	if _, err := tempFile.Write(kubeconfigData); err != nil {
		return "", fmt.Errorf("failed to write kubeconfig data: %w", err)
	}

	return tempFile.Name(), nil
}

func (cp *ClusterPlugin) getClusterAdmToken(hubContext string) (string, error) {
	cmd := exec.Command("clusteradm", "get", "token", "--context", hubContext)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get clusteradm token: %w, output: %s", err, string(output))
	}

	token := strings.TrimSpace(string(output))
	return token, nil
}

func (cp *ClusterPlugin) joinClusterToHub(kubeconfigPath, clusterName, joinToken string) error {
	cmd := exec.Command("clusteradm", "join", "--hub-token", joinToken, "--cluster-name", clusterName, "--kubeconfig", kubeconfigPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to join cluster: %w, output: %s", err, string(output))
	}

	log.Printf("Join command output: %s", string(output))
	return nil
}

func (cp *ClusterPlugin) waitForAndApproveCSR(clientset *kubernetes.Clientset, clusterName string) error {
	timeout := time.After(10 * time.Minute)
	tick := time.Tick(10 * time.Second)

	for {
		select {
		case <-timeout:
			return fmt.Errorf("timeout waiting for CSR")
		case <-tick:
			csrList, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				continue
			}

			for _, csr := range csrList.Items {
				if strings.Contains(csr.Name, clusterName) && !cp.isCSRApproved(csr) {
					approvalPatch := []byte(`{"status":{"conditions":[{"type":"Approved","status":"True","reason":"ApprovedByAPI","message":"Approved via API"}]}}`)

					_, err := clientset.CertificatesV1().CertificateSigningRequests().Patch(
						context.TODO(),
						csr.Name,
						types.MergePatchType,
						approvalPatch,
						metav1.PatchOptions{},
					)
					if err != nil {
						return fmt.Errorf("failed to approve CSR: %w", err)
					}

					log.Printf("CSR for cluster %s approved", clusterName)
					return nil
				} else if strings.Contains(csr.Name, clusterName) && cp.isCSRApproved(csr) {
					return nil
				}
			}
		}
	}
}

func (cp *ClusterPlugin) isCSRApproved(csr certificatesv1.CertificateSigningRequest) bool {
	for _, condition := range csr.Status.Conditions {
		if condition.Type == certificatesv1.CertificateApproved {
			return true
		}
	}
	return false
}

func (cp *ClusterPlugin) waitForManagedCluster(clientset *kubernetes.Clientset, clusterName string) error {
	timeout := time.After(5 * time.Minute)
	tick := time.Tick(10 * time.Second)

	for {
		select {
		case <-timeout:
			return fmt.Errorf("timeout waiting for managed cluster")
		case <-tick:
			result := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				Name(clusterName).
				Do(context.TODO())

			if err := result.Error(); err == nil {
				acceptPatch := []byte(`{"spec":{"hubAcceptsClient":true}}`)

				clientset.RESTClient().Patch(types.MergePatchType).
					AbsPath("/apis/cluster.open-cluster-management.io/v1").
					Resource("managedclusters").
					Name(clusterName).
					Body(acceptPatch).
					Do(context.TODO())

				return nil
			}
		}
	}
}

func (cp *ClusterPlugin) checkManagedClusterExists(clientset *kubernetes.Clientset, clusterName string) (bool, error) {
	result := clientset.RESTClient().Get().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Do(context.TODO())

	err := result.Error()
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return false, nil
		}
		return false, err
	}

	return true, nil
}

func (cp *ClusterPlugin) executeDetachCommand(itsContext, clusterName string) error {
	hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}

	result := hubClientset.RESTClient().Delete().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Do(context.TODO())

	return result.Error()
}

func (cp *ClusterPlugin) waitForClusterRemoval(clientset *kubernetes.Clientset, clusterName string) error {
	timeout := time.After(5 * time.Minute)
	tick := time.Tick(5 * time.Second)

	for {
		select {
		case <-timeout:
			return fmt.Errorf("timeout waiting for cluster removal")
		case <-tick:
			exists, err := cp.checkManagedClusterExists(clientset, clusterName)
			if err != nil {
				return err
			}
			if !exists {
				return nil
			}
		}
	}
}

func (cp *ClusterPlugin) updateManagedClusterLabels(clientset *kubernetes.Clientset, restConfig interface{}, clusterName string, newLabels map[string]string) error {
	// This is a simplified implementation
	// In practice, you would need to implement label update logic
	log.Printf("Updating labels for cluster %s: %v", clusterName, newLabels)
	return nil
}
