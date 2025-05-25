package api

import (
	"context"
	"encoding/json"
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
    "regexp"
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/models"
	certificatesv1 "k8s.io/api/certificates/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured" // Add this import
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

var (
	clusterStatuses = make(map[string]string)
	mutex           sync.RWMutex
)

// OnboardClusterHandler handles HTTP requests to onboard a new cluster
func OnboardClusterHandler(c *gin.Context) {
	// Check if this is a file upload, JSON payload, or just a cluster name
	contentType := c.GetHeader("Content-Type")

	var kubeconfigData []byte
	var clusterName string
	var useLocalKubeconfig bool = false

	// Handle form-data with file upload
	if strings.Contains(contentType, "multipart/form-data") {
		file, fileErr := c.FormFile("kubeconfig")
		clusterName = c.PostForm("name")

		// If cluster name is provided but no file, try to use local kubeconfig
		if clusterName != "" && (fileErr != nil || file == nil) {
			useLocalKubeconfig = true
		} else if fileErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve kubeconfig file"})
			return
		} else if clusterName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
			return
		} else {
			// Use uploaded file
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
		// Handle JSON payload
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

		// If kubeconfig is empty but cluster name is provided, use local kubeconfig
		if req.Kubeconfig == "" {
			useLocalKubeconfig = true
		} else {
			kubeconfigData = []byte(req.Kubeconfig)
		}
	} else {
		// Handle URL parameters
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
		kubeconfigData, err = getClusterConfigFromLocal(clusterName)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to find cluster '%s' in local kubeconfig: %v", clusterName, err)})
			return
		}
	}

	// Check if the cluster is already being onboarded
	mutex.Lock()
	if status, exists := clusterStatuses[clusterName]; exists {
		mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, status),
			"status":  status,
		})
		return
	}
	clusterStatuses[clusterName] = "Pending"
	mutex.Unlock()

	// Log initial event and clear any previous events
	ClearOnboardingEvents(clusterName)
	LogOnboardingEvent(clusterName, "Initiated", "Onboarding process initiated by API request")

	// Start asynchronous onboarding
	go func() {
		err := OnboardCluster(kubeconfigData, clusterName)
		mutex.Lock()
		if err != nil {
			log.Printf("Cluster '%s' onboarding failed: %v", clusterName, err)
			clusterStatuses[clusterName] = "Failed"
		} else {
			clusterStatuses[clusterName] = "Onboarded"
			log.Printf("Cluster '%s' onboarded successfully", clusterName)
		}
		mutex.Unlock()
	}()

	c.JSON(http.StatusOK, gin.H{
		"message":           fmt.Sprintf("Cluster '%s' is being onboarded", clusterName),
		"status":            "Pending",
		"logsEndpoint":      fmt.Sprintf("/clusters/onboard/logs/%s", clusterName),
		"websocketEndpoint": fmt.Sprintf("/ws/onboarding?cluster=%s", clusterName),
	})
}

// getClusterConfigFromLocal extracts a specific cluster's config from the local kubeconfig file
func getClusterConfigFromLocal(clusterName string) ([]byte, error) {
	// Get the path to the kubeconfig file
	kubeconfig := kubeconfigPath()

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Check if the cluster exists
	cluster, exists := config.Clusters[clusterName]
	if !exists {
		// Try to find a context that references this cluster
		for contextName, ctx := range config.Contexts {
			if ctx.Cluster == clusterName {
				// Found a context with this cluster
				return extractContextConfig(config, contextName)
			}
		}

		// If we're here, no matching cluster or context was found
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
		// No context found for this cluster, create a minimal config
		authInfoName = "default-user"
		contextName = clusterName + "-ctx"
	}

	// Create a new kubeconfig with just this cluster
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

	// Add auth info if it exists
	if authInfo, exists := config.AuthInfos[authInfoName]; exists {
		newConfig.AuthInfos[authInfoName] = authInfo
	}

	// Serialize the config to YAML
	return clientcmd.Write(newConfig)
}

// approveClusterCSRs finds and approves any pending CSRs for the specified cluster
func approveClusterCSRs(clientset *kubernetes.Clientset, clusterName string) error {
	LogOnboardingEvent(clusterName, "Searching", "Looking for Certificate Signing Requests for cluster")

	// List all CSRs
	csrList, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to list CSRs: "+err.Error())
		return fmt.Errorf("failed to list CSRs: %w", err)
	}

	// Check if there are any pending CSRs for our cluster
	pendingCSRs := []string{}

	for _, csr := range csrList.Items {
		if strings.Contains(csr.Name, clusterName) && !isCSRApproved(csr) {
			pendingCSRs = append(pendingCSRs, csr.Name)
			LogOnboardingEvent(clusterName, "Found", fmt.Sprintf("Found pending CSR: %s", csr.Name))
		}
	}

	if len(pendingCSRs) == 0 {
		LogOnboardingEvent(clusterName, "Info", "No pending CSRs found for this cluster")

		// Wait briefly and check again
		LogOnboardingEvent(clusterName, "Waiting", "Waiting 30 seconds for CSRs to appear")
		time.Sleep(30 * time.Second)

		// Check again
		csrList, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			LogOnboardingEvent(clusterName, "Error", "Failed to list CSRs after waiting: "+err.Error())
			return fmt.Errorf("failed to list CSRs after waiting: %w", err)
		}

		for _, csr := range csrList.Items {
			if strings.Contains(csr.Name, clusterName) && !isCSRApproved(csr) {
				pendingCSRs = append(pendingCSRs, csr.Name)
				LogOnboardingEvent(clusterName, "Found", fmt.Sprintf("Found pending CSR after waiting: %s", csr.Name))
			}
		}
	}

	// If we found pending CSRs, approve them directly using kubectl
	if len(pendingCSRs) > 0 {
		LogOnboardingEvent(clusterName, "Approving", fmt.Sprintf("Approving %d CSRs", len(pendingCSRs)))

		// Method 1: Use kubectl directly (more reliable based on your experience)
		approveCmd := exec.Command("kubectl", append([]string{"--context", "its1", "certificate", "approve"}, pendingCSRs...)...)
		output, err := approveCmd.CombinedOutput()
		if err != nil {
			LogOnboardingEvent(clusterName, "Error", fmt.Sprintf("Failed to approve CSRs using kubectl: %v, %s", err, string(output)))

			// Method 2: Fall back to SDK approach if kubectl fails
			LogOnboardingEvent(clusterName, "Fallback", "Falling back to SDK approach for CSR approval")
			for _, csrName := range pendingCSRs {
				approvalPatch := []byte(`{"status":{"conditions":[{"type":"Approved","status":"True","reason":"ApprovedByAPI","message":"Approved via KubeStellar API"}]}}`)

				_, err := clientset.CertificatesV1().CertificateSigningRequests().Patch(
					context.TODO(),
					csrName,
					types.MergePatchType,
					approvalPatch,
					metav1.PatchOptions{},
				)
				if err != nil {
					LogOnboardingEvent(clusterName, "Error", fmt.Sprintf("Failed to approve CSR %s: %v", csrName, err))
					return fmt.Errorf("failed to approve CSR %s: %w", csrName, err)
				}

				LogOnboardingEvent(clusterName, "Approved", fmt.Sprintf("Successfully approved CSR %s", csrName))
			}
		} else {
			LogOnboardingEvent(clusterName, "Approved", fmt.Sprintf("Successfully approved CSRs using kubectl: %s", string(output)))
		}
	} else {
		LogOnboardingEvent(clusterName, "Warning", "No CSRs found to approve. Will proceed and check status later.")
	}

	// Also try using clusteradm to accept the cluster (with skip-approve-check)
	acceptCmd := exec.Command("clusteradm", "--context", "its1", "accept", "--clusters", clusterName, "--skip-approve-check")
	acceptOutput, acceptErr := acceptCmd.CombinedOutput()
	if acceptErr != nil {
		LogOnboardingEvent(clusterName, "Warning", fmt.Sprintf("clusteradm accept had issues: %v, %s", acceptErr, string(acceptOutput)))
		// Continue anyway as direct CSR approval might have worked
	} else {
		LogOnboardingEvent(clusterName, "Accepted", fmt.Sprintf("Cluster accepted via clusteradm: %s", string(acceptOutput)))
	}

	return nil
}

// Helper function to check if a CSR is already approved
func isCSRApproved(csr certificatesv1.CertificateSigningRequest) bool {
	for _, condition := range csr.Status.Conditions {
		if condition.Type == certificatesv1.CertificateApproved {
			return true
		}
	}
	return false
}

// extractContextConfig creates a kubeconfig file for a specific context
func extractContextConfig(config *clientcmdapi.Config, contextName string) ([]byte, error) {
	// Check if the context exists
	context, exists := config.Contexts[contextName]
	if !exists {
		return nil, fmt.Errorf("context '%s' not found in kubeconfig", contextName)
	}

	// Get the associated cluster and auth info
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

	// Create a new config with just this context, cluster, and auth info
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

	// Serialize the config to YAML
	return clientcmd.Write(newConfig)
}

// Wait for the managed cluster to be created
func waitForManagedClusterCreation(clientset *kubernetes.Clientset, clusterName string, timeout time.Duration) error {
	LogOnboardingEvent(clusterName, "Waiting", fmt.Sprintf("Waiting up to %v for managed cluster to be created", timeout))

	timeoutCh := time.After(timeout)
	tickerCh := time.Tick(5 * time.Second)

	for {
		select {
		case <-timeoutCh:
			return fmt.Errorf("timeout waiting for managed cluster %s to be created", clusterName)
		case <-tickerCh:
			LogOnboardingEvent(clusterName, "Checking", fmt.Sprintf("Checking if managed cluster %s exists", clusterName))

			// Check if the managed cluster exists
			result := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				Name(clusterName).
				Do(context.TODO())

			err := result.Error()
			if err == nil {
				LogOnboardingEvent(clusterName, "Found", fmt.Sprintf("Managed cluster %s exists", clusterName))
				return nil
			}

			LogOnboardingEvent(clusterName, "Waiting", fmt.Sprintf("Managed cluster %s not found yet, continuing to wait", clusterName))
		}
	}
}

// Updated acceptManagedCluster function with retry logic
func acceptManagedCluster(clientset *kubernetes.Clientset, clusterName string) error {
	// First wait for the managed cluster to be created
	if err := waitForManagedClusterCreation(clientset, clusterName, 2*time.Minute); err != nil {
		LogOnboardingEvent(clusterName, "Error", fmt.Sprintf("Failed waiting for managed cluster: %v", err))
		return err
	}

	LogOnboardingEvent(clusterName, "Accepting", fmt.Sprintf("Attempting to accept managed cluster %s", clusterName))

	// Create acceptance patch
	acceptancePatch := []byte(`{"spec":{"hubAcceptsClient":true}}`)

	LogOnboardingEvent(clusterName, "Updating", "Setting hubAcceptsClient to true")
	patchResult := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(acceptancePatch).
		Do(context.TODO())

	if err := patchResult.Error(); err != nil {
		LogOnboardingEvent(clusterName, "Error", fmt.Sprintf("Failed to accept managed cluster: %v", err))
		return fmt.Errorf("failed to accept managed cluster: %w", err)
	}

	LogOnboardingEvent(clusterName, "Accepted", fmt.Sprintf("Managed cluster %s successfully accepted", clusterName))
	return nil
}

// GetClusterStatusHandler returns the status of all onboarded clusters
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

// UpdateManagedClusterLabelsHandler updates labels for a managed cluster
func UpdateManagedClusterLabelsHandler(c *gin.Context) {
    log.Printf("[DEBUG] ========== HANDLER START ==========")
    log.Printf("[DEBUG] Method: %s", c.Request.Method)
    log.Printf("[DEBUG] Path: %s", c.Request.URL.Path)
    log.Printf("[DEBUG] Content-Type: %s", c.GetHeader("Content-Type"))
    
    var req struct {
        ContextName     string            `json:"contextName"`
        ClusterName     string            `json:"clusterName"`
        ClusterNames    []string          `json:"clusterNames"`
        Labels          map[string]string `json:"labels"`
        IsBulkOperation bool              `json:"isBulkOperation"`
    }

    // Read the raw body for debugging
    bodyBytes, err := io.ReadAll(c.Request.Body)
    if err != nil {
        log.Printf("[ERROR] Failed to read request body: %v", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
        return
    }
    
    log.Printf("[DEBUG] Raw request body: %s", string(bodyBytes))
    
    // Recreate the request body for binding
    c.Request.Body = io.NopCloser(strings.NewReader(string(bodyBytes)))

    if err := c.BindJSON(&req); err != nil {
        log.Printf("[ERROR] Failed to bind JSON: %v", err)
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
        return
    }

    log.Printf("[DEBUG] Parsed request - Context: %s, Cluster: %s", req.ContextName, req.ClusterName)
    log.Printf("[DEBUG] Parsed labels: %+v", req.Labels)

    // Count how many labels have empty values (these are deletions)
    emptyCount := 0
    for key, value := range req.Labels {
        if value == "" {
            emptyCount++
            log.Printf("[DEBUG] Found deletion request for label: %s", key)
        }
    }
    log.Printf("[DEBUG] Total labels to delete: %d", emptyCount)

    // Handle single cluster operation
    if req.ContextName == "" || req.ClusterName == "" {
        log.Printf("[ERROR] Missing required fields - Context: %s, Cluster: %s", req.ContextName, req.ClusterName)
        c.JSON(http.StatusBadRequest, gin.H{"error": "contextName and clusterName are required"})
        return
    }

    log.Printf("[DEBUG] Getting clientset for context: %s", req.ContextName)
    clientset, restConfig, err := k8s.GetClientSetWithConfigContext(req.ContextName)
    if err != nil {
        log.Printf("[ERROR] Failed to get clientset: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get Kubernetes client"})
        return
    }

    log.Printf("[DEBUG] Updating labels for cluster: %s", req.ClusterName)
    err = UpdateManagedClusterLabels(clientset, restConfig, req.ClusterName, req.Labels)
    if err != nil {
        log.Printf("[ERROR] Failed to update cluster labels: %v", err)
        
        // Check if this is a partial success error
        if strings.Contains(err.Error(), "PARTIAL_SUCCESS:") {
            message := strings.Replace(err.Error(), "PARTIAL_SUCCESS: ", "", 1)
            log.Printf("[WARNING] Returning partial success to frontend: %s", message)
            // Return 400 status with PARTIAL_SUCCESS prefix so frontend can detect it
            c.JSON(http.StatusBadRequest, gin.H{"error": "PARTIAL_SUCCESS: " + message})
            return
        }
        
        c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to update cluster labels: %v", err)})
        return
    }

    log.Printf("[DEBUG] Successfully updated labels for cluster: %s", req.ClusterName)
    c.JSON(http.StatusOK, gin.H{"message": "Cluster labels updated successfully"})
    log.Printf("[DEBUG] ========== HANDLER END ==========")
}

// OnboardCluster handles the entire process of onboarding a cluster
// waitForAndApproveCSR waits for and approves the CSR using clusteradm and SDK fallback
func waitForAndApproveCSR(clientset *kubernetes.Clientset, clusterName string) error {
	// Try using clusteradm first for accepting the cluster (which also approves CSRs)
	log.Printf("Attempting to accept cluster %s using clusteradm", clusterName)

	cmd := exec.Command("clusteradm", "accept", "--clusters", clusterName)
	output, err := cmd.CombinedOutput()

	// Check for success or expected auto-approval message
	if err == nil || (err != nil && strings.Contains(string(output), "ManagedClusterAutoApproval feature is enabled")) {
		log.Printf("Cluster %s accepted using clusteradm: %s", clusterName, string(output))
		return nil
	}

	// If clusteradm fails, log the error and fall back to SDK approach
	log.Printf("clusteradm accept failed: %s, %v. Falling back to SDK approach.", string(output), err)
	LogOnboardingEvent(clusterName, "Warning", fmt.Sprintf("clusteradm accept failed: %s", string(output)))

	// Wait for CSR to appear
	timeout := time.After(10 * time.Minute)
	tick := time.Tick(10 * time.Second)

	log.Printf("Waiting for CSR for cluster %s to appear...", clusterName)
	LogOnboardingEvent(clusterName, "Waiting", "Waiting for Certificate Signing Request (CSR)")

	for {
		select {
		case <-timeout:
			LogOnboardingEvent(clusterName, "Error", "Timeout waiting for CSR")
			return fmt.Errorf("timeout waiting for CSR")
		case <-tick:
			// Check for pending CSRs related to the cluster
			csrList, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{})
			if err != nil {
				log.Printf("Error listing CSRs: %v", err)
				continue
			}

			approvedAny := false
			for _, csr := range csrList.Items {
				// Check if this CSR is for our cluster
				if strings.Contains(csr.Name, clusterName) && !isCSRApproved(csr) {
					// Approve the CSR
					log.Printf("Found CSR for cluster %s, approving...", clusterName)
					LogOnboardingEvent(clusterName, "Approving", fmt.Sprintf("Approving CSR %s", csr.Name))

					// Create approve patch
					approvalPatch := []byte(`{"status":{"conditions":[{"type":"Approved","status":"True","reason":"ApprovedByAPI","message":"Approved via API"}]}}`)

					_, err := clientset.CertificatesV1().CertificateSigningRequests().Patch(
						context.TODO(),
						csr.Name,
						types.MergePatchType,
						approvalPatch,
						metav1.PatchOptions{},
					)
					if err != nil {
						LogOnboardingEvent(clusterName, "Error", fmt.Sprintf("Failed to approve CSR: %v", err))
						return fmt.Errorf("failed to approve CSR: %w", err)
					}

					log.Printf("CSR for cluster %s approved", clusterName)
					LogOnboardingEvent(clusterName, "Approved", fmt.Sprintf("CSR %s approved successfully", csr.Name))
					approvedAny = true
				} else if strings.Contains(csr.Name, clusterName) && isCSRApproved(csr) {
					// CSR is already approved
					log.Printf("CSR for cluster %s is already approved", clusterName)
					LogOnboardingEvent(clusterName, "Info", fmt.Sprintf("CSR %s is already approved", csr.Name))
					approvedAny = true
				}
			}

			if approvedAny {
				// If we found any CSRs for this cluster (either approved now or previously), we're good
				LogOnboardingEvent(clusterName, "Complete", "All CSRs for cluster are approved")
				return nil
			}
		}
	}
}

// waitForManagedCluster waits for the managed cluster to be created and accepts it
func waitForManagedCluster(clientset *kubernetes.Clientset, clusterName string) error {
	timeout := time.After(5 * time.Minute)
	tick := time.Tick(10 * time.Second)

	log.Printf("Waiting for managed cluster %s to be created...", clusterName)
	LogOnboardingEvent(clusterName, "Waiting", "Waiting for managed cluster resource to be created")

	for {
		select {
		case <-timeout:
			LogOnboardingEvent(clusterName, "Error", "Timeout waiting for managed cluster")
			return fmt.Errorf("timeout waiting for managed cluster")
		case <-tick:
			// Check if the managed cluster exists
			result := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				Name(clusterName).
				Do(context.TODO())

			err := result.Error()
			if err == nil {
				log.Printf("Managed cluster %s created", clusterName)
				LogOnboardingEvent(clusterName, "Created", "Managed cluster resource created successfully")

				// Attempt to accept the managed cluster by setting hubAcceptsClient to true
				acceptPatch := []byte(`{"spec":{"hubAcceptsClient":true}}`)

				patchResult := clientset.RESTClient().Patch(types.MergePatchType).
					AbsPath("/apis/cluster.open-cluster-management.io/v1").
					Resource("managedclusters").
					Name(clusterName).
					Body(acceptPatch).
					Do(context.TODO())

				if patchErr := patchResult.Error(); patchErr != nil {
					log.Printf("Warning: Failed to accept managed cluster: %v", patchErr)
					LogOnboardingEvent(clusterName, "Warning", fmt.Sprintf("Failed to accept managed cluster: %v", patchErr))
					// Continue anyway as it might already be accepted by clusteradm or auto-approval
				} else {
					log.Printf("Managed cluster %s accepted", clusterName)
					LogOnboardingEvent(clusterName, "Accepted", "Managed cluster accepted successfully")
				}

				return nil
			}

			// Continue waiting if not found
			log.Printf("Waiting for managed cluster %s to be created...", clusterName)
		}
	}
}

// OnboardCluster handles the entire process of onboarding a cluster
func OnboardCluster(kubeconfigData []byte, clusterName string) error {
	// Register the start of onboarding and log it
	RegisterOnboardingStart(clusterName)

	// 1. Validate the cluster's connectivity
	LogOnboardingEvent(clusterName, "Validating", "Validating cluster connectivity")
	if err := ValidateClusterConnectivity(kubeconfigData); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Connectivity validation failed: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("cluster validation failed: %w", err)
	}
	LogOnboardingEvent(clusterName, "Validated", "Cluster connectivity validated successfully")

	// 2. Get the ITS hub context (OCM hub)
	itsContext := "its1" // Can be parameterized
	LogOnboardingEvent(clusterName, "Connecting", "Connecting to ITS hub context: "+itsContext)

	// 3. Get clients for the hub
	hubClientset, hubConfig, err := k8s.GetClientSetWithConfigContext(itsContext)
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to get hub clientset: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to get hub clientset: %w", err)
	}
	LogOnboardingEvent(clusterName, "Connected", "Successfully connected to ITS hub")

	// 4. Create a temporary kubeconfig file for the target cluster
	LogOnboardingEvent(clusterName, "Preparing", "Creating temporary kubeconfig for the target cluster")
	tempPath, err := createTempKubeconfig(kubeconfigData, clusterName)
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to create temp kubeconfig: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to create temp kubeconfig: %w", err)
	}
	defer os.Remove(tempPath)
	LogOnboardingEvent(clusterName, "Prepared", "Temporary kubeconfig created: "+tempPath)

	// 5. Get the join command from the hub
	LogOnboardingEvent(clusterName, "Retrieving", "Getting join token from the OCM hub")
	joinToken, err := getClusterAdmToken(itsContext)
	if err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to get token: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to get token: %w", err)
	}
	LogOnboardingEvent(clusterName, "Retrieved", "Successfully retrieved join token")

	// 6. Apply the join command to the target cluster
	LogOnboardingEvent(clusterName, "Joining", "Applying join command to the target cluster")
	if err := joinClusterToHub(tempPath, clusterName, joinToken); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to join cluster: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to join cluster: %w", err)
	}
	LogOnboardingEvent(clusterName, "Joined", "Cluster successfully joined to the hub")

	// 7. Approve CSRs for the cluster - REPLACED WITH NEW FUNCTION
	LogOnboardingEvent(clusterName, "Approving", "Looking for and approving Certificate Signing Requests (CSRs)")
	if err := approveClusterCSRs(hubClientset, clusterName); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to approve CSRs: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to approve CSRs: %w", err)
	}
	LogOnboardingEvent(clusterName, "Approved", "CSRs approved successfully")

	// 8. Wait for the managed cluster to be created and accept it
	LogOnboardingEvent(clusterName, "Waiting", "Waiting for managed cluster resource to be created")
	if err := waitForManagedCluster(hubClientset, clusterName); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to confirm managed cluster creation: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to confirm managed cluster creation: %w", err)
	}
	LogOnboardingEvent(clusterName, "Created", "Managed cluster resource created successfully")

	// Wait a short time for acceptance to propagate
	LogOnboardingEvent(clusterName, "Processing", "Waiting for acceptance to propagate")
	time.Sleep(5 * time.Second)

	// 9. Label the managed cluster
	LogOnboardingEvent(clusterName, "Labeling", "Applying labels to the managed cluster")
	if err := UpdateManagedClusterLabels(hubClientset, hubConfig, clusterName, map[string]string{
		"location-group": "edge",
		"name":           clusterName,
	}); err != nil {
		LogOnboardingEvent(clusterName, "Error", "Failed to label managed cluster: "+err.Error())
		RegisterOnboardingComplete(clusterName, err)
		return fmt.Errorf("failed to label managed cluster: %w", err)
	}
	LogOnboardingEvent(clusterName, "Labeled", "Cluster labeled successfully")

	// 10. Wait for the cluster to be fully available
	LogOnboardingEvent(clusterName, "Verifying", "Waiting for cluster to become fully available")
	startTime := time.Now()
	timeout := 3 * time.Minute
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	availabilityTimedOut := true
	for time.Since(startTime) < timeout {
		<-ticker.C

		// Check the cluster status
		result := hubClientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			Name(clusterName).
			Do(context.TODO())

		raw, err := result.Raw()
		if err != nil {
			LogOnboardingEvent(clusterName, "Warning", fmt.Sprintf("Failed to get managed cluster: %v", err))
			continue
		}

		var managedCluster map[string]interface{}
		if err := json.Unmarshal(raw, &managedCluster); err != nil {
			LogOnboardingEvent(clusterName, "Warning", fmt.Sprintf("Failed to unmarshal managed cluster: %v", err))
			continue
		}

		status, found := managedCluster["status"].(map[string]interface{})
		if !found {
			continue
		}

		conditions, found := status["conditions"].([]interface{})
		if !found {
			continue
		}

		joined := false
		available := false

		for _, condI := range conditions {
			cond, ok := condI.(map[string]interface{})
			if !ok {
				continue
			}

			condType, _ := cond["type"].(string)
			condStatus, _ := cond["status"].(string)

			if condType == "ManagedClusterJoined" && condStatus == "True" {
				joined = true
			}

			if condType == "ManagedClusterConditionAvailable" && condStatus == "True" {
				available = true
			}
		}

		if joined && available {
			LogOnboardingEvent(clusterName, "Available", "Cluster is fully available and joined")
			availabilityTimedOut = false
			break
		}

		LogOnboardingEvent(clusterName, "Waiting", fmt.Sprintf("Cluster joined: %v, available: %v", joined, available))
	}

	if availabilityTimedOut {
		LogOnboardingEvent(clusterName, "Warning", "Timeout waiting for cluster to become fully available, continuing anyway")
	}

	LogOnboardingEvent(clusterName, "Success", "Cluster onboarded successfully")
	RegisterOnboardingComplete(clusterName, nil)
	log.Printf("Cluster '%s' onboarded successfully", clusterName)
	return nil
}

// ValidateClusterConnectivity checks if the cluster is accessible
func ValidateClusterConnectivity(kubeconfigData []byte) error {
	// Load REST config from kubeconfig
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
	if err != nil {
		return fmt.Errorf("failed to parse kubeconfig: %w", err)
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	// Test connectivity by listing nodes
	_, err = client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to connect to the cluster: %w", err)
	}

	return nil
}

// getClusterAdmToken retrieves the join token using clusteradm
func getClusterAdmToken(hubContext string) (string, error) {
	cmd := exec.Command("clusteradm", "--context", hubContext, "get", "token")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get token: %s, %w", string(output), err)
	}

	// Extract the join command from the output
	outputStr := string(output)
	for _, line := range strings.Split(outputStr, "\n") {
		if strings.HasPrefix(line, "clusteradm join") {
			return line, nil
		}
	}

	return "", fmt.Errorf("join command not found in output: %s", outputStr)
}

// createTempKubeconfig creates a temporary kubeconfig file
func createTempKubeconfig(kubeconfigData []byte, clusterName string) (string, error) {
	// Create temporary file
	tempDir := os.TempDir()
	tempFile := filepath.Join(tempDir, fmt.Sprintf("kubeconfig-%s-%d", clusterName, time.Now().UnixNano()))

	// Parse the kubeconfig
	config, err := clientcmd.Load(kubeconfigData)
	if err != nil {
		return "", fmt.Errorf("invalid kubeconfig format: %w", err)
	}

	// Adjust the config if needed (e.g., for localhost to proper hostname)
	adjustClusterServerEndpoints(config)

	// Write the modified config to the temporary file
	if err := clientcmd.WriteToFile(*config, tempFile); err != nil {
		return "", fmt.Errorf("failed to write temporary kubeconfig: %w", err)
	}

	return tempFile, nil
}

// adjustClusterServerEndpoints replaces localhost with proper names
func adjustClusterServerEndpoints(config *clientcmdapi.Config) {
	for name, cluster := range config.Clusters {
		if strings.Contains(cluster.Server, "localhost") {
			cluster.Server = strings.Replace(cluster.Server, "localhost", name, 1)
		}
	}
}

// joinClusterToHub applies the join command to the target cluster
func joinClusterToHub(kubeconfigPath, clusterName, joinToken string) error {
	// Replace cluster name placeholder in join command
	joinCmd := strings.Replace(joinToken, "<cluster_name>", clusterName, 1)

	// Split the command into arguments
	cmdParts := strings.Fields(joinCmd)
	cmdParts = append(cmdParts, "--context", clusterName, "--singleton", "--force-internal-endpoint-lookup")

	// Create the command
	cmd := exec.Command(cmdParts[0], cmdParts[1:]...)
	cmd.Env = append(os.Environ(), fmt.Sprintf("KUBECONFIG=%s", kubeconfigPath))

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("join command failed: %s, %w", string(output), err)
	}

	log.Printf("Join command output: %s", string(output))
	return nil
}

// UpdateManagedClusterLabels with dynamic binding policy protection
func UpdateManagedClusterLabels(clientset *kubernetes.Clientset, config *rest.Config, clusterName string, newLabels map[string]string) error {
    log.Printf("[DEBUG] ========== UpdateManagedClusterLabels ==========")
    log.Printf("[DEBUG] Cluster: %s", clusterName)
    log.Printf("[DEBUG] Received labels: %+v", newLabels)

    // Get binding policies to check which labels are in use
    bindingPolicyLabels, err := getLabelsUsedInBindingPolicies()
    if err != nil {
        log.Printf("[WARNING] Could not fetch binding policy labels: %v", err)
        // Continue with empty set - will fall back to system protection only
        bindingPolicyLabels = make(map[string]bool)
    }

    log.Printf("[DEBUG] Binding policy labels found: %+v", bindingPolicyLabels)

    dynamicClient, err := dynamic.NewForConfig(config)
    if err != nil {
        log.Printf("[ERROR] Failed to create dynamic client: %v", err)
        return fmt.Errorf("failed to create dynamic client: %v", err)
    }

    gvr := schema.GroupVersionResource{
        Group:    "cluster.open-cluster-management.io",
        Version:  "v1",
        Resource: "managedclusters",
    }

    // Get current cluster
    currentCluster, err := dynamicClient.Resource(gvr).Get(context.TODO(), clusterName, metav1.GetOptions{})
    if err != nil {
        log.Printf("[ERROR] Failed to get managed cluster %s: %v", clusterName, err)
        return fmt.Errorf("failed to get managed cluster %s: %v", clusterName, err)
    }

    // Get current labels
    currentLabels := make(map[string]string)
    if labels, found, err := unstructured.NestedStringMap(currentCluster.Object, "metadata", "labels"); err == nil && found {
        currentLabels = labels
    }
    log.Printf("[DEBUG] Current cluster labels: %+v", currentLabels)

    // Create final labels map - start with current labels
    finalLabels := make(map[string]string)
    for k, v := range currentLabels {
        finalLabels[k] = v
    }

    // Preserve system labels that shouldn't be removed
    systemPrefixes := []string{
        "cluster.open-cluster-management.io/",
        "feature.open-cluster-management.io/",
        "kubernetes.io/",
        "k8s.io/",
        "node.openshift.io/",
        "beta.kubernetes.io/",
        "topology.kubernetes.io/",
        "node-role.kubernetes.io/",
    }

    // Function to check if a label is protected
    isLabelProtected := func(key string) (bool, string) {
        // Check system label prefixes
        for _, prefix := range systemPrefixes {
            if strings.HasPrefix(key, prefix) {
                return true, "system"
            }
        }
        
        // Check if label is used in binding policies
        if bindingPolicyLabels[key] {
            log.Printf("[DEBUG] Label %s is protected by binding policy", key)
            return true, "binding-policy"
        }
        
        return false, ""
    }

    // Track what actually happened for better error reporting
    protectedDeletions := []string{}
    protectedModifications := []string{}
    successfulDeletions := []string{}
    successfulAdditions := []string{}

    // Process new labels
    for key, value := range newLabels {
        if value != "" {
            // Adding/updating label
            protected, reason := isLabelProtected(key)
            
            if protected && currentLabels[key] != value {
                protectedModifications = append(protectedModifications, fmt.Sprintf("%s (%s)", key, reason))
                log.Printf("[WARNING] Attempt to modify %s label blocked: %s", reason, key)
                // Keep the original value for protected labels
                if originalValue, exists := currentLabels[key]; exists {
                    finalLabels[key] = originalValue
                } else {
                    // If it's a new protected label, don't add it
                    delete(finalLabels, key)
                }
            } else {
                finalLabels[key] = value
                successfulAdditions = append(successfulAdditions, key)
                log.Printf("[DEBUG] Adding/updating label: %s = %s", key, value)
            }
        } else {
            // Deletion attempt (empty value)
            protected, reason := isLabelProtected(key)
            
            if protected {
                protectedDeletions = append(protectedDeletions, fmt.Sprintf("%s (%s)", key, reason))
                log.Printf("[WARNING] Attempt to delete %s label blocked: %s", reason, key)
                // Preserve the original value - DO NOT DELETE
                if originalValue, exists := currentLabels[key]; exists {
                    finalLabels[key] = originalValue
                    log.Printf("[DEBUG] Preserved %s label: %s = %s", reason, key, originalValue)
                }
            } else {
                successfulDeletions = append(successfulDeletions, key)
                log.Printf("[DEBUG] DELETING non-protected label: %s", key)
                // Remove from finalLabels
                delete(finalLabels, key)
            }
        }
    }

    log.Printf("[DEBUG] Summary - Added/Updated: %v, Deleted: %v, Protected deletions: %v, Protected modifications: %v", 
        successfulAdditions, successfulDeletions, protectedDeletions, protectedModifications)
    log.Printf("[DEBUG] Final labels to apply: %+v", finalLabels)

    // Double-check: Ensure all binding policy labels are preserved
    for labelKey := range bindingPolicyLabels {
        if originalValue, exists := currentLabels[labelKey]; exists {
            finalLabels[labelKey] = originalValue
            log.Printf("[DEBUG] Force-preserved binding policy label: %s = %s", labelKey, originalValue)
        }
    }

    // Create a JSON patch that replaces the entire labels object
    patches := []map[string]interface{}{
        {
            "op":    "replace",
            "path":  "/metadata/labels",
            "value": finalLabels,
        },
    }

    patchBytes, err := json.Marshal(patches)
    if err != nil {
        log.Printf("[ERROR] Failed to marshal patch: %v", err)
        return fmt.Errorf("failed to marshal patch: %v", err)
    }

    log.Printf("[DEBUG] JSON Patch: %s", string(patchBytes))

    // Apply the JSON patch
    _, err = dynamicClient.Resource(gvr).Patch(
        context.TODO(),
        clusterName,
        types.JSONPatchType,
        patchBytes,
        metav1.PatchOptions{},
    )

    if err != nil {
        log.Printf("[ERROR] Patch failed: %v", err)
        return fmt.Errorf("failed to patch managed cluster %s: %v", clusterName, err)
    }

    log.Printf("[DEBUG] Patch successful!")
    
    // **THIS IS THE CRITICAL PART THAT WAS MISSING**
    // Return an error if there were protected operations that were blocked
    if len(protectedDeletions) > 0 || len(protectedModifications) > 0 {
        var errorParts []string
        
        if len(protectedDeletions) > 0 {
            // Extract just the label names without the (binding-policy) or (system) suffix
            var labelNames []string
            for _, protectedLabel := range protectedDeletions {
                // Extract just the label name before the parentheses
                parts := strings.Split(protectedLabel, " (")
                if len(parts) > 0 {
                    labelNames = append(labelNames, parts[0])
                }
            }
            errorParts = append(errorParts, fmt.Sprintf("Cannot delete protected labels: %s", strings.Join(labelNames, ", ")))
        }
        
        if len(protectedModifications) > 0 {
            var labelNames []string
            for _, protectedLabel := range protectedModifications {
                parts := strings.Split(protectedLabel, " (")
                if len(parts) > 0 {
                    labelNames = append(labelNames, parts[0])
                }
            }
            errorParts = append(errorParts, fmt.Sprintf("Cannot modify protected labels: %s", strings.Join(labelNames, ", ")))
        }
        
        errorMessage := strings.Join(errorParts, "; ")
        
        log.Printf("[WARNING] Returning partial success error: %s", errorMessage)
        // ADD THE MISSING PARTIAL_SUCCESS PREFIX:
        return fmt.Errorf("PARTIAL_SUCCESS: %s", errorMessage)
    }
    
    log.Printf("[DEBUG] Successfully updated labels for cluster: %s", clusterName)
    log.Printf("[DEBUG] ========== End UpdateManagedClusterLabels ==========")
    
    return nil
}

// getLabelsUsedInBindingPolicies fetches labels used in binding policies
func getLabelsUsedInBindingPolicies() (map[string]bool, error) {
    log.Printf("[DEBUG] Fetching labels used in binding policies...")
    
    usedLabels := make(map[string]bool)
    
    // Make HTTP request to get binding policies
    resp, err := http.Get("http://localhost:4000/api/bp")
    if err != nil {
        return usedLabels, fmt.Errorf("failed to fetch binding policies: %v", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return usedLabels, fmt.Errorf("binding policies API returned status %d", resp.StatusCode)
    }
    
    var response struct {
        BindingPolicies []struct {
            Name string `json:"name"`
            Spec struct {
                ClusterSelectors []struct {
                    MatchLabels map[string]string `json:"matchLabels"`
                    MatchExpressions []struct {
                        Key string `json:"key"`
                    } `json:"matchExpressions"`
                } `json:"clusterSelectors"`
            } `json:"spec"`
            ClusterSelectors []map[string]string `json:"clusterSelectors"` // For stored policies
            Clusters []string `json:"clusters"` // For cluster strings like "environment=production"
            YAML string `json:"yaml"` // Raw YAML content
        } `json:"bindingPolicies"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
        return usedLabels, fmt.Errorf("failed to decode binding policies response: %v", err)
    }
    
    log.Printf("[DEBUG] Found %d binding policies to analyze", len(response.BindingPolicies))
    
    // Extract labels from binding policies
    for _, bp := range response.BindingPolicies {
        log.Printf("[DEBUG] Processing binding policy: %s", bp.Name)
        
        // Method 1: Check spec.clusterSelectors.matchLabels (standard format)
        for _, selector := range bp.Spec.ClusterSelectors {
            for key := range selector.MatchLabels {
                usedLabels[key] = true
                log.Printf("[DEBUG] Found binding policy label from spec.clusterSelectors.matchLabels: %s", key)
            }
            
            // Also check matchExpressions
            for _, expr := range selector.MatchExpressions {
                if expr.Key != "" {
                    usedLabels[expr.Key] = true
                    log.Printf("[DEBUG] Found binding policy label from spec.clusterSelectors.matchExpressions: %s", expr.Key)
                }
            }
        }
        
        // Method 2: Check stored clusterSelectors (for UI-created policies)
        for _, selector := range bp.ClusterSelectors {
            for key := range selector {
                usedLabels[key] = true
                log.Printf("[DEBUG] Found binding policy label from stored clusterSelectors: %s", key)
            }
        }
        
        // Method 3: Check clusters array for "key=value" format
        for _, cluster := range bp.Clusters {
            if strings.Contains(cluster, "=") {
                parts := strings.Split(cluster, "=")
                if len(parts) >= 2 {
                    key := strings.TrimSpace(parts[0])
                    if key != "" {
                        usedLabels[key] = true
                        log.Printf("[DEBUG] Found binding policy label from clusters array: %s", key)
                    }
                }
            } else if strings.Contains(cluster, ":") {
                // Handle "env:local" format
                parts := strings.Split(cluster, ":")
                if len(parts) >= 2 {
                    key := strings.TrimSpace(parts[0])
                    if key != "" {
                        usedLabels[key] = true
                        log.Printf("[DEBUG] Found binding policy label from clusters array (colon format): %s", key)
                    }
                }
            }
        }
        
        // Method 4: Parse YAML content if available - Enhanced parsing
        if bp.YAML != "" {
            log.Printf("[DEBUG] Parsing YAML content for binding policy: %s", bp.Name)
            
            // Parse matchlabels sections (more flexible regex)
            matchLabelsPattern := regexp.MustCompile(`(?i)matchlabels:\s*\n((?:\s+\S+:.+\n?)*)`)
            matches := matchLabelsPattern.FindAllStringSubmatch(bp.YAML, -1)
            
            for _, match := range matches {
                if len(match) > 1 {
                    labelBlock := match[1]
                    labelLines := strings.Split(labelBlock, "\n")
                    for _, line := range labelLines {
                        line = strings.TrimSpace(line)
                        if line != "" && strings.Contains(line, ":") {
                            parts := strings.Split(line, ":")
                            if len(parts) >= 1 {
                                key := strings.TrimSpace(parts[0])
                                if key != "" {
                                    usedLabels[key] = true
                                    log.Printf("[DEBUG] Found binding policy label from YAML matchLabels: %s", key)
                                }
                            }
                        }
                    }
                }
            }
            
            // Also look for direct label references in YAML like "env: local"
            // This handles the specific case where labels are defined directly in clusterselectors
            yamlLines := strings.Split(bp.YAML, "\n")
            inClusterSelectors := false
            inMatchLabels := false
            
            for _, line := range yamlLines {
                trimmed := strings.TrimSpace(line)
                
                if strings.Contains(trimmed, "clusterselectors:") {
                    inClusterSelectors = true
                    continue
                }
                
                if inClusterSelectors && strings.Contains(trimmed, "matchlabels:") {
                    inMatchLabels = true
                    continue
                }
                
                if inMatchLabels && strings.Contains(trimmed, ":") && !strings.HasPrefix(trimmed, "-") {
                    // Check if this is a label definition (key: value)
                    if !strings.Contains(trimmed, "matchlabels") && 
                       !strings.Contains(trimmed, "matchexpressions") &&
                       !strings.Contains(trimmed, "downsync") &&
                       !strings.Contains(trimmed, "spec:") {
                        
                        parts := strings.Split(trimmed, ":")
                        if len(parts) >= 1 {
                            key := strings.TrimSpace(parts[0])
                            // Filter out non-label keys
                            if key != "" && 
                               !strings.Contains(key, "apigroup") &&
                               !strings.Contains(key, "resources") &&
                               !strings.Contains(key, "namespaces") {
                                usedLabels[key] = true
                                log.Printf("[DEBUG] Found binding policy label from YAML direct parsing: %s", key)
                            }
                        }
                    }
                }
                
                // Reset flags when we exit sections
                if strings.HasPrefix(trimmed, "downsync:") || strings.HasPrefix(trimmed, "spec:") {
                    inClusterSelectors = false
                    inMatchLabels = false
                }
            }
        }
    }
    
    log.Printf("[DEBUG] Total binding policy labels found: %d", len(usedLabels))
    for label := range usedLabels {
        log.Printf("[DEBUG] BP Label: %s", label)
    }
    
    return usedLabels, nil
}

// kubeconfigPath returns the path to the kubeconfig file
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


