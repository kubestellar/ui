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
    clusterStatuses map[string]ClusterStatus
    mutex          sync.RWMutex
    initialized    bool
    kubeconfigDir  string
}

type ClusterStatus struct {
    ClusterName   string `json:"clusterName"`
    Status        string `json:"status"`
    Message       string `json:"message,omitempty"`
    LastUpdated   string `json:"lastUpdated"`
    KubeconfigPath string `json:"kubeconfigPath,omitempty"`
}

// Initialize initializes the cluster plugin
func (cp *ClusterPlugin) Initialize(config map[string]interface{}) error {
    cp.mutex.Lock()
    defer cp.mutex.Unlock()

    if cp.initialized {
        return fmt.Errorf("plugin already initialized")
    }

    cp.clusterStatuses = make(map[string]ClusterStatus)
    cp.kubeconfigDir = "/tmp/kubestellar-clusters"
    
    // Create kubeconfig directory if it doesn't exist
    if err := os.MkdirAll(cp.kubeconfigDir, 0755); err != nil {
        log.Printf("Warning: Failed to create kubeconfig directory: %v", err)
    }

    // Check for required tools
    if err := cp.checkCommand("kubectl"); err != nil {
        log.Printf("Warning: kubectl not available: %v", err)
    }
    if err := cp.checkCommand("clusteradm"); err != nil {
        log.Printf("Warning: clusteradm not available: %v", err)
    }

    cp.initialized = true
    log.Println("✅ Cluster plugin initialized successfully with real onboarding capabilities")
    return nil
}

// GetMetadata returns plugin metadata
func (cp *ClusterPlugin) GetMetadata() dynamic_plugins.PluginMetadata {
    return dynamic_plugins.PluginMetadata{
        ID:          "kubestellar-cluster-plugin",
        Name:        "KubeStellar Cluster Management",
        Version:     "1.0.0",
        Description: "Plugin for cluster onboarding and detachment operations with real functionality",
        Author:      "CNCF LFX Mentee",
        Endpoints: []dynamic_plugins.EndpointConfig{
            {Path: "/onboard", Method: "POST", Handler: "OnboardClusterHandler"},
            {Path: "/detach", Method: "POST", Handler: "DetachClusterHandler"},
            {Path: "/status", Method: "GET", Handler: "GetClusterStatusHandler"},
        },
        Dependencies: []string{"kubectl", "clusteradm"},
        Permissions:  []string{"cluster.read", "cluster.write"},
        Compatibility: map[string]string{
            "kubestellar": ">=0.21.0",
            "go":          ">=1.21",
        },
    }
}

// GetHandlers returns the plugin's HTTP handlers
func (cp *ClusterPlugin) GetHandlers() map[string]gin.HandlerFunc {
    return map[string]gin.HandlerFunc{
        "OnboardClusterHandler":     cp.OnboardClusterHandler,
        "DetachClusterHandler":      cp.DetachClusterHandler,
        "GetClusterStatusHandler":   cp.GetClusterStatusHandler,
    }
}

// Health performs a health check
func (cp *ClusterPlugin) Health() error {
    if !cp.initialized {
        return fmt.Errorf("plugin not initialized")
    }
    return nil
}

// Cleanup performs cleanup operations
func (cp *ClusterPlugin) Cleanup() error {
    cp.mutex.Lock()
    defer cp.mutex.Unlock()
    cp.initialized = false
    log.Println("🧹 Cluster plugin cleaned up")
    return nil
}

// checkCommand verifies that a command is available in PATH
func (cp *ClusterPlugin) checkCommand(command string) error {
    _, err := exec.LookPath(command)
    return err
}

// OnboardClusterHandler handles cluster onboarding requests with enhanced real functionality
func (cp *ClusterPlugin) OnboardClusterHandler(c *gin.Context) {
    log.Println("🚀 Plugin: Handling REAL cluster onboarding request")
    
    contentType := c.GetHeader("Content-Type")
    var kubeconfigData []byte
    var clusterName string
    var useLocalKubeconfig bool = false

    // Handle different content types (same as before)
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

    // Get kubeconfig from local if needed
    if useLocalKubeconfig {
        var err error
        kubeconfigData, err = cp.getClusterConfigFromLocal(clusterName)
        if err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to find cluster '%s' in local kubeconfig: %v", clusterName, err)})
            return
        }
    }

    // Check if cluster is already being onboarded
    cp.mutex.Lock()
    if existing, exists := cp.clusterStatuses[clusterName]; exists {
        cp.mutex.Unlock()
        c.JSON(http.StatusConflict, gin.H{
            "message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, existing.Status),
            "status":  existing.Status,
            "cluster": existing,
            "plugin":  "kubestellar-cluster-plugin",
        })
        return
    }
    
    // Set initial status with enhanced tracking
    cp.clusterStatuses[clusterName] = ClusterStatus{
        ClusterName: clusterName,
        Status:      "Pending",
        Message:     "Real onboarding process initiated",
        LastUpdated: time.Now().Format(time.RFC3339),
    }
    cp.mutex.Unlock()

    // Start enhanced asynchronous onboarding
    go func() {
        err := cp.onboardClusterEnhanced(kubeconfigData, clusterName)
        cp.mutex.Lock()
        if err != nil {
            log.Printf("🔥 Plugin: Cluster '%s' onboarding failed: %v", clusterName, err)
            cp.clusterStatuses[clusterName] = ClusterStatus{
                ClusterName: clusterName,
                Status:      "Failed",
                Message:     fmt.Sprintf("Onboarding failed: %v", err),
                LastUpdated: time.Now().Format(time.RFC3339),
            }
        } else {
            cp.clusterStatuses[clusterName] = ClusterStatus{
                ClusterName: clusterName,
                Status:      "Ready",
                Message:     "Cluster successfully onboarded to KubeStellar",
                LastUpdated: time.Now().Format(time.RFC3339),
            }
            log.Printf("✅ Plugin: Cluster '%s' onboarded successfully", clusterName)
        }
        cp.mutex.Unlock()
    }()

    c.JSON(http.StatusOK, gin.H{
        "message": fmt.Sprintf("Real cluster '%s' onboarding started via plugin", clusterName),
        "status":  "Pending",
        "plugin":  "kubestellar-cluster-plugin",
        "clusterName": clusterName,
        "timestamp": time.Now().Format(time.RFC3339),
    })
}

// DetachClusterHandler handles cluster detachment requests with enhanced functionality
func (cp *ClusterPlugin) DetachClusterHandler(c *gin.Context) {
    log.Println("🗑️ Plugin: Handling REAL cluster detachment request")
    
    var req struct {
        ClusterName string `json:"clusterName" binding:"required"`
        Force       bool   `json:"force,omitempty"`
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

    cp.mutex.Lock()
    existing, exists := cp.clusterStatuses[clusterName]
    if !exists {
        cp.mutex.Unlock()
        c.JSON(http.StatusNotFound, gin.H{
            "error": fmt.Sprintf("Cluster '%s' not found in plugin", clusterName),
            "plugin": "kubestellar-cluster-plugin",
        })
        return
    }

    // Set detaching status
    cp.clusterStatuses[clusterName] = ClusterStatus{
        ClusterName: clusterName,
        Status:      "Detaching",
        Message:     "Real detachment process started",
        LastUpdated: time.Now().Format(time.RFC3339),
    }
    cp.mutex.Unlock()

    // Start enhanced asynchronous detachment
    go func() {
        err := cp.detachClusterEnhanced(clusterName, req.Force)
        cp.mutex.Lock()
        if err != nil {
            log.Printf("🔥 Plugin: Cluster '%s' detachment failed: %v", clusterName, err)
            cp.clusterStatuses[clusterName] = ClusterStatus{
                ClusterName: clusterName,
                Status:      "DetachFailed",
                Message:     fmt.Sprintf("Detachment failed: %v", err),
                LastUpdated: time.Now().Format(time.RFC3339),
            }
        } else {
            delete(cp.clusterStatuses, clusterName)
            log.Printf("✅ Plugin: Cluster '%s' detached successfully", clusterName)
        }
        cp.mutex.Unlock()
    }()

    c.JSON(http.StatusOK, gin.H{
        "message": fmt.Sprintf("Real cluster '%s' detachment started via plugin", clusterName),
        "status":  "Detaching",
        "previous": existing,
        "plugin":  "kubestellar-cluster-plugin",
        "timestamp": time.Now().Format(time.RFC3339),
    })
}

// GetClusterStatusHandler returns the status of all clusters with enhanced information
func (cp *ClusterPlugin) GetClusterStatusHandler(c *gin.Context) {
    cp.mutex.RLock()
    defer cp.mutex.RUnlock()

    var clusters []ClusterStatus
    for _, status := range cp.clusterStatuses {
        clusters = append(clusters, status)
    }

    // Create summary statistics
    summary := map[string]int{
        "total":     len(clusters),
        "ready":     0,
        "pending":   0,
        "failed":    0,
        "detaching": 0,
    }

    for _, cluster := range clusters {
        switch cluster.Status {
        case "Ready":
            summary["ready"]++
        case "Pending":
            summary["pending"]++
        case "Failed":
            summary["failed"]++
        case "Detaching":
            summary["detaching"]++
        }
    }

    c.JSON(http.StatusOK, gin.H{
        "clusters":  clusters,
        "summary":   summary,
        "plugin":    "kubestellar-cluster-plugin",
        "timestamp": time.Now().Format(time.RFC3339),
    })
}

// Enhanced onboarding logic with real KubeStellar integration
func (cp *ClusterPlugin) onboardClusterEnhanced(kubeconfigData []byte, clusterName string) error {
    log.Printf("🔄 Plugin: Starting ENHANCED onboarding for cluster %s", clusterName)

    // Step 1: Update status and validate connectivity
    cp.updateStatus(clusterName, "Validating", "Validating cluster connectivity")
    if err := cp.validateClusterConnectivity(kubeconfigData); err != nil {
        return fmt.Errorf("cluster validation failed: %w", err)
    }

    // Step 2: Get ITS hub context and clients
    cp.updateStatus(clusterName, "Connecting", "Connecting to ITS hub")
    itsContext := "its1"
    hubClientset, hubConfig, err := k8s.GetClientSetWithConfigContext(itsContext)
    if err != nil {
        return fmt.Errorf("failed to get hub clientset: %w", err)
    }

    // Step 3: Save kubeconfig and create temporary file
    cp.updateStatus(clusterName, "Preparing", "Preparing cluster configuration")
    kubeconfigPath := filepath.Join(cp.kubeconfigDir, fmt.Sprintf("%s-kubeconfig", clusterName))
    if err := cp.saveKubeconfig(kubeconfigPath, string(kubeconfigData)); err != nil {
        return fmt.Errorf("failed to save kubeconfig: %w", err)
    }

    tempPath, err := cp.createTempKubeconfig(kubeconfigData, clusterName)
    if err != nil {
        return fmt.Errorf("failed to create temp kubeconfig: %w", err)
    }
    defer os.Remove(tempPath)

    // Step 4: Get join token from hub
    cp.updateStatus(clusterName, "Retrieving", "Getting join token from hub")
    joinToken, err := cp.getClusterAdmToken(itsContext)
    if err != nil {
        return fmt.Errorf("failed to get token: %w", err)
    }

    // Step 5: Join cluster to hub
    cp.updateStatus(clusterName, "Joining", "Joining cluster to KubeStellar hub")
    if err := cp.joinClusterToHub(tempPath, clusterName, joinToken); err != nil {
        return fmt.Errorf("failed to join cluster: %w", err)
    }

    // Step 6: Enhanced CSR approval with multiple attempts
    cp.updateStatus(clusterName, "Approving", "Approving Certificate Signing Requests")
    if err := cp.approveClusterCSRsEnhanced(hubClientset, clusterName); err != nil {
        return fmt.Errorf("failed to approve CSRs: %w", err)
    }

    // Step 7: Wait for managed cluster with better status tracking
    cp.updateStatus(clusterName, "Creating", "Waiting for managed cluster resource")
    if err := cp.waitForManagedClusterEnhanced(hubClientset, clusterName); err != nil {
        return fmt.Errorf("failed to confirm managed cluster creation: %w", err)
    }

    // Step 8: Apply labels and finalize
    cp.updateStatus(clusterName, "Finalizing", "Applying cluster labels and configuration")
    if err := cp.applyClusterLabels(hubClientset, hubConfig, clusterName); err != nil {
        log.Printf("⚠️ Warning: Failed to apply labels: %v", err)
        // Don't fail the entire onboarding for label issues
    }

    // Step 9: Final verification
    cp.updateStatus(clusterName, "Verifying", "Performing final verification")
    if err := cp.verifyClusterHealth(hubClientset, clusterName); err != nil {
        log.Printf("⚠️ Warning: Health verification issues: %v", err)
        // Don't fail onboarding for verification warnings
    }

    log.Printf("✅ Plugin: Cluster '%s' onboarding completed successfully", clusterName)
    return nil
}

// Enhanced detachment logic
func (cp *ClusterPlugin) detachClusterEnhanced(clusterName string, force bool) error {
    log.Printf("🔄 Plugin: Starting ENHANCED detachment for cluster %s", clusterName)

    // Step 1: Connect to hub
    cp.updateStatus(clusterName, "Detaching", "Connecting to hub for cleanup")
    itsContext := "its1"
    hubClientset, _, err := k8s.GetClientSetWithConfigContext(itsContext)
    if err != nil {
        if !force {
            return fmt.Errorf("failed to get hub clientset: %w", err)
        }
        log.Printf("⚠️ Warning: Failed to connect to hub, continuing with force flag")
    }

    // Step 2: Remove from hub
    if hubClientset != nil {
        cp.updateStatus(clusterName, "Removing", "Removing cluster from hub")
        if err := cp.removeFromHub(hubClientset, clusterName); err != nil {
            if !force {
                return fmt.Errorf("failed to remove from hub: %w", err)
            }
            log.Printf("⚠️ Warning: Failed to remove from hub, continuing with force flag: %v", err)
        }
    }

    // Step 3: Clean up local resources
    cp.updateStatus(clusterName, "Cleaning", "Cleaning up local resources")
    if err := cp.cleanupLocalResources(clusterName); err != nil {
        if !force {
            return fmt.Errorf("failed to cleanup local resources: %w", err)
        }
        log.Printf("⚠️ Warning: Failed to cleanup local resources, continuing with force flag: %v", err)
    }

    log.Printf("✅ Plugin: Cluster '%s' detachment completed successfully", clusterName)
    return nil
}

// Enhanced helper functions

func (cp *ClusterPlugin) updateStatus(clusterName, status, message string) {
    cp.mutex.Lock()
    defer cp.mutex.Unlock()
    
    cp.clusterStatuses[clusterName] = ClusterStatus{
        ClusterName: clusterName,
        Status:      status,
        Message:     message,
        LastUpdated: time.Now().Format(time.RFC3339),
    }
    
    log.Printf("📝 Plugin: %s - %s: %s", clusterName, status, message)
}

func (cp *ClusterPlugin) saveKubeconfig(path, content string) error {
    return os.WriteFile(path, []byte(content), 0600)
}

func (cp *ClusterPlugin) approveClusterCSRsEnhanced(clientset *kubernetes.Clientset, clusterName string) error {
    log.Printf("🔍 Plugin: Enhanced CSR approval for cluster %s", clusterName)

    // Try clusteradm accept first
    cmd := exec.Command("clusteradm", "--context", "its1", "accept", "--clusters", clusterName)
    output, err := cmd.CombinedOutput()
    
    if err == nil || strings.Contains(string(output), "ManagedClusterAutoApproval") {
        log.Printf("✅ Plugin: Cluster accepted via clusteradm: %s", string(output))
        return nil
    }

    log.Printf("⚠️ Plugin: clusteradm accept failed, falling back to manual CSR approval: %v", err)

    // Manual CSR approval with retries
    for attempt := 1; attempt <= 3; attempt++ {
        log.Printf("🔄 Plugin: CSR approval attempt %d/3", attempt)
        
        time.Sleep(time.Duration(attempt*10) * time.Second)

        csrList, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            log.Printf("❌ Plugin: Failed to list CSRs: %v", err)
            continue
        }

        pendingCSRs := []string{}
        for _, csr := range csrList.Items {
            if strings.Contains(csr.Name, clusterName) && !cp.isCSRApproved(csr) {
                pendingCSRs = append(pendingCSRs, csr.Name)
            }
        }

        if len(pendingCSRs) == 0 {
            log.Printf("🔍 Plugin: No pending CSRs found for cluster %s on attempt %d", clusterName, attempt)
            if attempt == 3 {
                log.Printf("⚠️ Plugin: No CSRs found after 3 attempts, proceeding anyway")
                return nil
            }
            continue
        }

        log.Printf("📋 Plugin: Found %d pending CSRs: %v", len(pendingCSRs), pendingCSRs)

        // Try kubectl approve first
        approveCmd := exec.Command("kubectl", append([]string{"--context", "its1", "certificate", "approve"}, pendingCSRs...)...)
        output, err := approveCmd.CombinedOutput()
        
        if err == nil {
            log.Printf("✅ Plugin: CSRs approved via kubectl: %s", string(output))
            return nil
        }

        log.Printf("⚠️ Plugin: kubectl approve failed, trying SDK approach: %v", err)

        // Fallback to SDK approval
        if err := cp.approveCSRsWithSDK(clientset, pendingCSRs); err != nil {
            log.Printf("❌ Plugin: SDK approval failed on attempt %d: %v", attempt, err)
            if attempt == 3 {
                return err
            }
            continue
        }

        log.Printf("✅ Plugin: CSRs approved via SDK")
        return nil
    }

    return fmt.Errorf("failed to approve CSRs after 3 attempts")
}

func (cp *ClusterPlugin) waitForManagedClusterEnhanced(clientset *kubernetes.Clientset, clusterName string) error {
    timeout := time.After(5 * time.Minute)
    tick := time.Tick(10 * time.Second)

    log.Printf("⏳ Plugin: Waiting for managed cluster %s to be created...", clusterName)

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
                log.Printf("✅ Plugin: Managed cluster %s created", clusterName)

                // Accept the cluster
                acceptPatch := []byte(`{"spec":{"hubAcceptsClient":true}}`)
                patchResult := clientset.RESTClient().Patch(types.MergePatchType).
                    AbsPath("/apis/cluster.open-cluster-management.io/v1").
                    Resource("managedclusters").
                    Name(clusterName).
                    Body(acceptPatch).
                    Do(context.TODO())

                if patchErr := patchResult.Error(); patchErr != nil {
                    log.Printf("⚠️ Plugin: Warning - Failed to accept managed cluster: %v", patchErr)
                } else {
                    log.Printf("✅ Plugin: Managed cluster %s accepted", clusterName)
                }

                return nil
            }
            
            log.Printf("⏳ Plugin: Still waiting for managed cluster %s...", clusterName)
        }
    }
}

func (cp *ClusterPlugin) applyClusterLabels(clientset *kubernetes.Clientset, hubConfig interface{}, clusterName string) error {
    log.Printf("🏷️ Plugin: Applying labels to cluster %s", clusterName)
    
    // Apply basic labels
    labelPatch := []byte(`{"metadata":{"labels":{"location-group":"edge","name":"` + clusterName + `","managed-by":"kubestellar-plugin"}}}`)
    
    patchResult := clientset.RESTClient().Patch(types.MergePatchType).
        AbsPath("/apis/cluster.open-cluster-management.io/v1").
        Resource("managedclusters").
        Name(clusterName).
        Body(labelPatch).
        Do(context.TODO())

    if err := patchResult.Error(); err != nil {
        return fmt.Errorf("failed to apply labels: %w", err)
    }

    log.Printf("✅ Plugin: Labels applied to cluster %s", clusterName)
    return nil
}

func (cp *ClusterPlugin) verifyClusterHealth(clientset *kubernetes.Clientset, clusterName string) error {
    log.Printf("🔍 Plugin: Verifying health of cluster %s", clusterName)
    
    // Simple health check - verify the managed cluster exists and is accepted
    result := clientset.RESTClient().Get().
        AbsPath("/apis/cluster.open-cluster-management.io/v1").
        Resource("managedclusters").
        Name(clusterName).
        Do(context.TODO())

    if err := result.Error(); err != nil {
        return fmt.Errorf("cluster health check failed: %w", err)
    }

    log.Printf("✅ Plugin: Cluster %s health verification passed", clusterName)
    return nil
}

func (cp *ClusterPlugin) removeFromHub(clientset *kubernetes.Clientset, clusterName string) error {
    log.Printf("🗑️ Plugin: Removing cluster %s from hub", clusterName)

    deleteResult := clientset.RESTClient().Delete().
        AbsPath("/apis/cluster.open-cluster-management.io/v1").
        Resource("managedclusters").
        Name(clusterName).
        Do(context.TODO())

    if err := deleteResult.Error(); err != nil {
        return fmt.Errorf("failed to delete managed cluster: %w", err)
    }

    log.Printf("✅ Plugin: Cluster %s removed from hub", clusterName)
    return nil
}

func (cp *ClusterPlugin) cleanupLocalResources(clusterName string) error {
    log.Printf("🧹 Plugin: Cleaning up local resources for cluster %s", clusterName)

    // Remove saved kubeconfig
    kubeconfigPath := filepath.Join(cp.kubeconfigDir, fmt.Sprintf("%s-kubeconfig", clusterName))
    if err := os.Remove(kubeconfigPath); err != nil && !os.IsNotExist(err) {
        return fmt.Errorf("failed to remove kubeconfig: %w", err)
    }

    log.Printf("✅ Plugin: Local resources cleaned up for cluster %s", clusterName)
    return nil
}

// Keep all the existing helper functions (same as before)
func (cp *ClusterPlugin) getClusterConfigFromLocal(clusterName string) ([]byte, error) {
    kubeconfig := cp.kubeconfigPath()
    config, err := clientcmd.LoadFromFile(kubeconfig)
    if err != nil {
        return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
    }

    cluster, exists := config.Clusters[clusterName]
    if !exists {
        // Try to find a context that references this cluster
        for contextName, ctx := range config.Contexts {
            if ctx.Cluster == clusterName {
                return cp.extractContextConfig(config, contextName)
            }
        }
        return nil, fmt.Errorf("cluster '%s' not found in local kubeconfig", clusterName)
    }

    // Find a context that uses this cluster
    var contextName string
    var authInfoName string

    for ctxName, ctx := range config.Contexts {
        if ctx.Cluster == clusterName {
            contextName = ctxName
            authInfoName = ctx.AuthInfo
            break
        }
    }

    if contextName == "" {
        authInfoName = "default-user"
        contextName = clusterName + "-ctx"
    }

    newConfig := clientcmdapi.Config{
        APIVersion: "v1",
        Kind:       "Config",
        Clusters: map[string]*clientcmdapi.Cluster{
            clusterName: cluster,
        },
        Contexts: map[string]*clientcmdapi.Context{
            contextName: {
                Cluster:  clusterName,
                AuthInfo: authInfoName,
            },
        },
        AuthInfos:      map[string]*clientcmdapi.AuthInfo{},
        CurrentContext: contextName,
    }

    if authInfo, exists := config.AuthInfos[authInfoName]; exists {
        newConfig.AuthInfos[authInfoName] = authInfo
    }

    return clientcmd.Write(newConfig)
}

func (cp *ClusterPlugin) extractContextConfig(config *clientcmdapi.Config, contextName string) ([]byte, error) {
    context, exists := config.Contexts[contextName]
    if !exists {
        return nil, fmt.Errorf("context '%s' not found in kubeconfig", contextName)
    }

    clusterName := context.Cluster
    authInfoName := context.AuthInfo

    cluster, exists := config.Clusters[clusterName]
    if !exists {
        return nil, fmt.Errorf("cluster '%s' referenced by context '%s' not found", clusterName, contextName)
    }

    authInfo, exists := config.AuthInfos[authInfoName]
    if !exists {
        return nil, fmt.Errorf("user '%s' referenced by context '%s' not found", authInfoName, contextName)
    }

    newConfig := clientcmdapi.Config{
        APIVersion: "v1",
        Kind:       "Config",
        Clusters: map[string]*clientcmdapi.Cluster{
            clusterName: cluster,
        },
        Contexts: map[string]*clientcmdapi.Context{
            contextName: context,
        },
        AuthInfos: map[string]*clientcmdapi.AuthInfo{
            authInfoName: authInfo,
        },
        CurrentContext: contextName,
    }

    return clientcmd.Write(newConfig)
}

func (cp *ClusterPlugin) validateClusterConnectivity(kubeconfigData []byte) error {
    config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
    if err != nil {
        return fmt.Errorf("failed to parse kubeconfig: %w", err)
    }

    client, err := kubernetes.NewForConfig(config)
    if err != nil {
        return fmt.Errorf("failed to create Kubernetes client: %w", err)
    }

    _, err = client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return fmt.Errorf("failed to connect to the cluster: %w", err)
    }

    return nil
}

func (cp *ClusterPlugin) getClusterAdmToken(hubContext string) (string, error) {
    cmd := exec.Command("clusteradm", "--context", hubContext, "get", "token")
    output, err := cmd.CombinedOutput()
    if err != nil {
        return "", fmt.Errorf("failed to get token: %s, %w", string(output), err)
    }

    outputStr := string(output)
    for _, line := range strings.Split(outputStr, "\n") {
        if strings.HasPrefix(line, "clusteradm join") {
            return line, nil
        }
    }

    return "", fmt.Errorf("join command not found in output: %s", outputStr)
}

func (cp *ClusterPlugin) createTempKubeconfig(kubeconfigData []byte, clusterName string) (string, error) {
    tempDir := os.TempDir()
    tempFile := filepath.Join(tempDir, fmt.Sprintf("kubeconfig-%s-%d", clusterName, time.Now().UnixNano()))

    config, err := clientcmd.Load(kubeconfigData)
    if err != nil {
        return "", fmt.Errorf("invalid kubeconfig format: %w", err)
    }

    // Adjust cluster server endpoints if needed
    for name, cluster := range config.Clusters {
        if strings.Contains(cluster.Server, "localhost") {
            cluster.Server = strings.Replace(cluster.Server, "localhost", name, 1)
        }
    }

    if err := clientcmd.WriteToFile(*config, tempFile); err != nil {
        return "", fmt.Errorf("failed to write temporary kubeconfig: %w", err)
    }

    return tempFile, nil
}

func (cp *ClusterPlugin) joinClusterToHub(kubeconfigPath, clusterName, joinToken string) error {
    joinCmd := strings.Replace(joinToken, "<cluster_name>", clusterName, 1)
    cmdParts := strings.Fields(joinCmd)
    cmdParts = append(cmdParts, "--context", clusterName, "--singleton", "--force-internal-endpoint-lookup")

    cmd := exec.Command(cmdParts[0], cmdParts[1:]...)
    cmd.Env = append(os.Environ(), fmt.Sprintf("KUBECONFIG=%s", kubeconfigPath))

    output, err := cmd.CombinedOutput()
    if err != nil {
        return fmt.Errorf("join command failed: %s, %w", string(output), err)
    }

    log.Printf("📝 Plugin: Join command output: %s", string(output))
    return nil
}

func (cp *ClusterPlugin) approveCSRsWithSDK(clientset *kubernetes.Clientset, csrNames []string) error {
    for _, csrName := range csrNames {
        approvalPatch := []byte(`{"status":{"conditions":[{"type":"Approved","status":"True","reason":"ApprovedByPlugin","message":"Approved via KubeStellar Plugin"}]}}`)

        _, err := clientset.CertificatesV1().CertificateSigningRequests().Patch(
            context.TODO(),
            csrName,
            types.MergePatchType,
            approvalPatch,
            metav1.PatchOptions{},
        )
        if err != nil {
            return fmt.Errorf("failed to approve CSR %s: %w", csrName, err)
        }
        log.Printf("✅ Plugin: Approved CSR %s via SDK", csrName)
    }
    return nil
}

func (cp *ClusterPlugin) isCSRApproved(csr certificatesv1.CertificateSigningRequest) bool {
    for _, condition := range csr.Status.Conditions {
        if condition.Type == certificatesv1.CertificateApproved {
            return true
        }
    }
    return false
}

func (cp *ClusterPlugin) kubeconfigPath() string {
    if path := os.Getenv("KUBECONFIG"); path != "" {
        return path
    }
    home, err := os.UserHomeDir()
    if err != nil {
        log.Fatalf("Unable to get user home directory: %v", err)
    }
    return fmt.Sprintf("%s/.kube/config", home)
}

// NewPlugin creates a new instance of the cluster plugin
// This is the required symbol that will be looked up when loading the plugin
func NewPlugin() interface{} {
    log.Println("🏗️ Plugin: Creating new ClusterPlugin instance with enhanced real onboarding")
    return &ClusterPlugin{}
}