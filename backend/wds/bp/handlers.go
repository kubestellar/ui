package bp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	bpv1alpha1 "github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/typed/control/v1alpha1"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

type StoredBindingPolicy struct {
	Name             string              `json:"name"`
	Namespace        string              `json:"namespace"`
	ClusterSelectors []map[string]string `json:"clusterSelectors"` // Each entry is matchLabels map
	APIGroups        []string            `json:"apiGroups"`
	Resources        []string            `json:"resources"`
	Namespaces       []string            `json:"namespaces"`
	RawYAML          string              `json:"rawYAML"`
}

// Global store for binding policies created via the UI
var uiCreatedPolicies = make(map[string]*StoredBindingPolicy)

// BindingPolicyWithStatus adds status information to the BindingPolicy
type BindingPolicyWithStatus struct {
	v1alpha1.BindingPolicy `json:",inline"`
	Status                 string   `json:"status"` // "active" or "inactive"
	BindingMode            string   `json:"bindingMode"`
	Clusters               []string `json:"clusters"`
	Workloads              []string `json:"workloads"`
}

// GetAllBp retrieves all BindingPolicies with enhanced information
func GetAllBp(ctx *gin.Context) {
	fmt.Printf("Debug - Retrieving all binding policies\n")
	fmt.Printf("Debug - KUBECONFIG: %s\n", os.Getenv("KUBECONFIG"))
	fmt.Printf("Debug - wds_context: %s\n", os.Getenv("wds_context"))

	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to create client for BP: %s", err.Error())})
		return
	}

	// Optional namespace filter
	namespace := ctx.Query("namespace")
	listOptions := v1.ListOptions{}

	// Get all binding policies
	bpList, err := c.BindingPolicies().List(context.TODO(), listOptions)
	if err != nil {
		fmt.Printf("Debug - List error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to list binding policies: %s", err.Error())})
		return
	}

	// Create a slice to hold the enhanced binding policies
	bpsWithStatus := make([]BindingPolicyWithStatus, 0, len(bpList.Items))

	// Add YAML representation and status to each policy
	for i := range bpList.Items {
		yamlData, err := yaml.Marshal(bpList.Items[i])
		if err != nil {
			fmt.Printf("Debug - YAML marshal error: %v\n", err)
			continue
		}

		// Initialize annotations map if it doesn't exist
		if bpList.Items[i].Annotations == nil {
			bpList.Items[i].Annotations = make(map[string]string)
		}

		// Add the YAML as a string to the policy
		bpList.Items[i].Annotations["yaml"] = string(yamlData)

		// Determine if the policy is active based on status fields
		status := "inactive"

		// Check if any conditions are present and if Synced and Ready are True
		hasSync := false
		hasReady := false

		for _, condition := range bpList.Items[i].Status.Conditions {
			if condition.Type == "Synced" && condition.Status == "True" {
				hasSync = true
			}
			if condition.Type == "Ready" && condition.Status == "True" {
				hasReady = true
			}
		}

		if hasSync && hasReady {
			status = "active"
		}

		// Extract binding mode
		bindingMode := "Downsync" // Default to Downsync since KubeStellar currently only supports Downsync

		// Extract target clusters from ClusterSelectors
		clusters := extractTargetClusters(&bpList.Items[i])

		// Extract workloads from Downsync
		workloads := extractWorkloads(&bpList.Items[i])

		// Create the enhanced policy with status
		bpWithStatus := BindingPolicyWithStatus{
			BindingPolicy: bpList.Items[i],
			Status:        status,
			BindingMode:   bindingMode,
			Clusters:      clusters,
			Workloads:     workloads,
		}

		bpsWithStatus = append(bpsWithStatus, bpWithStatus)
	}

	// Filter by namespace if specified
	if namespace != "" {
		fmt.Printf("Debug - Filtering by namespace: %s\n", namespace)
		filteredBPs := filterBPsByNamespace(bpsWithStatus, namespace)
		ctx.JSON(http.StatusOK, gin.H{
			"bindingPolicies": filteredBPs,
			"count":           len(filteredBPs),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"bindingPolicies": bpsWithStatus,
		"count":           len(bpsWithStatus),
	})
}

// extractTargetClusters extracts the list of target clusters from ClusterSelectors
func extractTargetClusters(bp *v1alpha1.BindingPolicy) []string {
	clusters := []string{}

	for _, selector := range bp.Spec.ClusterSelectors {
		// If matchLabels contains kubernetes.io/cluster-name, add it
		if clusterName, ok := selector.MatchLabels["kubernetes.io/cluster-name"]; ok {
			clusters = append(clusters, clusterName)
		}

		// Handle other selectors that might target clusters differently
		for k, v := range selector.MatchLabels {
			// Skip the standard cluster name we already processed
			if k == "kubernetes.io/cluster-name" {
				continue
			}
			// Add as "label:value" format to give context to the label
			clusters = append(clusters, fmt.Sprintf("%s:%s", k, v))
		}
	}

	return clusters
}

// extractWorkloads gets a list of workloads affected by this BP
func extractWorkloads(bp *v1alpha1.BindingPolicy) []string {
	workloads := []string{}

	// Process downsync resources
	for _, ds := range bp.Spec.Downsync {
		apiGroupValue := "core" // Default to core
		if ds.APIGroup != nil && *ds.APIGroup != "" {
			apiGroupValue = *ds.APIGroup
		}

		// Add each resource with its API group
		for _, resource := range ds.Resources {
			// Format as apiGroup/resource
			workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resource)

			// Add namespaces if specified
			if len(ds.Namespaces) > 0 {
				for _, ns := range ds.Namespaces {
					workloads = append(workloads, fmt.Sprintf("%s (ns:%s)", workloadType, ns))
				}
			} else {
				workloads = append(workloads, workloadType)
			}
		}
	}

	return workloads
}

// filterBPsByNamespace filters the binding policies by namespace
func filterBPsByNamespace(bps []BindingPolicyWithStatus, namespace string) []BindingPolicyWithStatus {
	var filtered []BindingPolicyWithStatus
	for _, bp := range bps {
		if bp.Namespace == namespace {
			filtered = append(filtered, bp)
		}
	}
	return filtered
}

// CreateBp creates a new BindingPolicy
func CreateBp(ctx *gin.Context) {
	fmt.Printf("Debug - Starting CreateBp handler\n")
	fmt.Printf("Debug - KUBECONFIG: %s\n", os.Getenv("KUBECONFIG"))
	fmt.Printf("Debug - wds_context: %s\n", os.Getenv("wds_context"))

	// Check Content-Type header
	contentType := ctx.GetHeader("Content-Type")
	fmt.Printf("Debug - Content-Type: %s\n", contentType)
	if !strings.Contains(contentType, "multipart/form-data") {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Content-Type must be multipart/form-data"})
		return
	}

	// Get the form file
	file, err := ctx.FormFile("bpYaml")
	if err != nil {
		fmt.Printf("Debug - FormFile error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to get form file: %s", err.Error())})
		return
	}

	fmt.Printf("Debug - Received file: %s\n", file.Filename)

	// Open and read the file
	f, err := file.Open()
	if err != nil {
		fmt.Printf("Debug - File open error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to open file: %s", err.Error())})
		return
	}
	defer f.Close()

	// Read file contents
	bpYamlBytes, err := io.ReadAll(f)
	if err != nil {
		fmt.Printf("Debug - Read error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read file: %s", err.Error())})
		return
	}

	// Raw YAML content for debugging and storage
	rawYAML := string(bpYamlBytes)
	fmt.Printf("Debug - Received YAML:\n%s\n", rawYAML)

	// Parse YAML into a generic map structure
	var yamlData map[string]interface{}
	if err := yaml.Unmarshal(bpYamlBytes, &yamlData); err != nil {
		fmt.Printf("Debug - YAML parsing error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid YAML format: %s", err.Error())})
		return
	}

	// Extract metadata
	metadataMap, ok := yamlData["metadata"].(map[interface{}]interface{})
	if !ok {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata section is required"})
		return
	}

	name, ok := metadataMap["name"].(string)
	if !ok || name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata.name is required"})
		return
	}

	namespace := "default"
	if ns, ok := metadataMap["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	// Extract spec
	specMap, ok := yamlData["spec"].(map[interface{}]interface{})
	if !ok {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "spec section is required"})
		return
	}

	// Create a StoredBindingPolicy to capture the original YAML information
	storedBP := &StoredBindingPolicy{
		Name:             name,
		Namespace:        namespace,
		ClusterSelectors: []map[string]string{},
		APIGroups:        []string{},
		Resources:        []string{},
		Namespaces:       []string{},
		RawYAML:          rawYAML,
	}

	// Extract cluster selectors
	clusterSelectors, ok := specMap["clusterSelectors"].([]interface{})
	if ok {
		fmt.Printf("Debug - Found %d cluster selectors\n", len(clusterSelectors))
		for i, selector := range clusterSelectors {
			selectorMap, ok := selector.(map[interface{}]interface{})
			if !ok {
				continue
			}

			matchLabels, ok := selectorMap["matchLabels"].(map[interface{}]interface{})
			if !ok {
				continue
			}

			// Convert to string map
			stringMap := make(map[string]string)
			for k, v := range matchLabels {
				key, ok1 := k.(string)
				val, ok2 := v.(string)
				if ok1 && ok2 {
					stringMap[key] = val
					fmt.Printf("Debug - Selector[%d] found label: %s=%s\n", i, key, val)
				}
			}

			if len(stringMap) > 0 {
				storedBP.ClusterSelectors = append(storedBP.ClusterSelectors, stringMap)
			}
		}
	}

	// Extract downsync
	downsync, ok := specMap["downsync"].([]interface{})
	if ok && len(downsync) > 0 {
		fmt.Printf("Debug - Found %d downsync rules\n", len(downsync))
		for i, rule := range downsync {
			ruleMap, ok := rule.(map[interface{}]interface{})
			if !ok {
				continue
			}

			// Extract API Group
			if apiGroup, ok := ruleMap["apiGroup"].(string); ok {
				storedBP.APIGroups = append(storedBP.APIGroups, apiGroup)
				fmt.Printf("Debug - Downsync[%d] apiGroup: %s\n", i, apiGroup)
			}

			// Extract Resources
			if resources, ok := ruleMap["resources"].([]interface{}); ok {
				for _, res := range resources {
					if resStr, ok := res.(string); ok {
						storedBP.Resources = append(storedBP.Resources, resStr)
						fmt.Printf("Debug - Downsync[%d] resource: %s\n", i, resStr)
					}
				}
			}

			// Extract Namespaces
			if namespaces, ok := ruleMap["namespaces"].([]interface{}); ok {
				for _, ns := range namespaces {
					if nsStr, ok := ns.(string); ok {
						storedBP.Namespaces = append(storedBP.Namespaces, nsStr)
						fmt.Printf("Debug - Downsync[%d] namespace: %s\n", i, nsStr)
					}
				}
			}
		}
	}

	// Create a new BP object for API use
	newBP := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			APIVersion: "control.kubestellar.io/v1alpha1",
			Kind:       "BindingPolicy",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}

	// Now parse the full YAML into the binding policy (best effort)
	if err := yaml.Unmarshal(bpYamlBytes, newBP); err != nil {
		fmt.Printf("Debug - Warning: Full unmarshal had issues: %v\n", err)
	}

	fmt.Printf("Debug - Parsed BindingPolicy for API:\n")
	fmt.Printf("Name: %s\n", newBP.Name)
	fmt.Printf("Namespace: %s\n", newBP.Namespace)

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Store policy before API call
	uiCreatedPolicies[name] = storedBP
	fmt.Printf("Debug - Stored policy in memory cache with key: %s\n", name)

	// Create the binding policy
	createdBP, err := c.BindingPolicies().Create(context.TODO(), newBP, v1.CreateOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ctx.JSON(http.StatusConflict, gin.H{
				"error":  fmt.Sprintf("BindingPolicy '%s' in namespace '%s' already exists", newBP.Name, newBP.Namespace),
				"status": "exists",
			})
			return
		}
		fmt.Printf("Debug - BP creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create binding policy: %s", err.Error())})
		return
	}

	// Generate clusters and workloads for response
	clusters := []string{}
	for _, selector := range storedBP.ClusterSelectors {
		if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
			clusters = append(clusters, clusterName)
		}
	}

	workloads := []string{}
	// Process each API group and resource combination
	for i, apiGroup := range storedBP.APIGroups {
		if i < len(storedBP.Resources) {
			resource := storedBP.Resources[i]
			workloadType := fmt.Sprintf("%s/%s", apiGroup, resource)

			// Add namespaces if specified
			if len(storedBP.Namespaces) > 0 {
				for _, ns := range storedBP.Namespaces {
					workloads = append(workloads, fmt.Sprintf("%s (ns:%s)", workloadType, ns))
				}
			} else {
				workloads = append(workloads, workloadType)
			}
		}
	}

	// Return success with created BP details
	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Created binding policy '%s' in namespace '%s' successfully", createdBP.Name, createdBP.Namespace),
		"bindingPolicy": gin.H{
			"name":        createdBP.Name,
			"namespace":   createdBP.Namespace,
			"status":      "inactive", // New policies start as inactive
			"bindingMode": "Downsync", // Only Downsync is supported
			"clusters":    clusters,
			"workloads":   workloads,
		},
	})
}

// DeleteBp deletes a BindingPolicy by name and namespace
func DeleteBp(ctx *gin.Context) {
	name := ctx.Query("name")
	namespace := ctx.Query("namespace")

	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name parameter is required"})
		return
	}

	if namespace == "" {
		namespace = "default"
	}

	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = c.BindingPolicies().Delete(context.TODO(), name, v1.DeleteOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete binding policy '%s' in namespace '%s': %v", name, namespace, err),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully deleted binding policy '%s' in namespace '%s'", name, namespace),
	})
}

// DeleteAllBp deletes all BindingPolicies
func DeleteAllBp(ctx *gin.Context) {
	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Optional namespace filter
	namespace := ctx.Query("namespace")
	listOptions := v1.ListOptions{}

	err = c.BindingPolicies().DeleteCollection(context.TODO(), v1.DeleteOptions{}, listOptions)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete binding policies: %v", err),
		})
		return
	}

	message := "Deleted all binding policies"
	if namespace != "" {
		message = fmt.Sprintf("Deleted all binding policies in namespace '%s'", namespace)
	}

	ctx.JSON(http.StatusOK, gin.H{"message": message})
}

// GetBpStatus retrieves the status of a specific BindingPolicy
func GetBpStatus(ctx *gin.Context) {
	name := ctx.Query("name")
	namespace := ctx.Query("namespace")

	fmt.Printf("Debug - GetBpStatus - Requested name: '%s', namespace: '%s'\n", name, namespace)

	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name parameter is required"})
		return
	}

	if namespace == "" {
		namespace = "default"
	}

	fmt.Printf("Debug - GetBpStatus - Using namespace: '%s'\n", namespace)

	// Check if we have this policy in our memory store
	storedBP, exists := uiCreatedPolicies[name]
	if exists {
		fmt.Printf("Debug - GetBpStatus - Found policy in memory store\n")
	}

	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - GetBpStatus - Client error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get binding policies from API
	bpList, err := c.BindingPolicies().List(context.TODO(), v1.ListOptions{})
	if err != nil {
		fmt.Printf("Debug - GetBpStatus - List error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to list binding policies: %v", err),
		})
		return
	}

	fmt.Printf("Debug - GetBpStatus - Found %d binding policies from API\n", len(bpList.Items))

	// Find the specific binding policy
	var bp *v1alpha1.BindingPolicy
	for i := range bpList.Items {
		if bpList.Items[i].Name == name {
			bp = &bpList.Items[i]
			fmt.Printf("Debug - Found BP with name '%s' in namespace '%s'\n",
				bp.Name, bp.Namespace)

			// Use requested namespace if not specified in API
			if bp.Namespace == "" {
				bp.Namespace = namespace
				fmt.Printf("Debug - Using requested namespace: %s\n", namespace)
			}

			break
		}
	}

	if bp == nil {
		ctx.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Binding policy '%s' not found", name),
		})
		return
	}

	// Determine if the policy is active based on status fields
	status := "inactive"

	// Check if any conditions are present and if Synced and Ready are True
	hasSync := false
	hasReady := false

	for _, condition := range bp.Status.Conditions {
		if condition.Type == "Synced" && condition.Status == "True" {
			hasSync = true
		}
		if condition.Type == "Ready" && condition.Status == "True" {
			hasReady = true
		}
	}

	if hasSync && hasReady {
		status = "active"
	}

	// Prepare response clusters and workloads
	var clusters []string
	var workloads []string

	// If we have a stored copy, use that for clusters and workloads
	if exists {
		fmt.Printf("Debug - Using stored policy data for response\n")

		// Extract clusters from stored data
		clusters = []string{}
		for _, selector := range storedBP.ClusterSelectors {
			if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
				clusters = append(clusters, clusterName)
			}
		}

		// Extract workloads from stored data
		workloads = []string{}
		for i, apiGroup := range storedBP.APIGroups {
			if i < len(storedBP.Resources) {
				resource := storedBP.Resources[i]
				workloadType := fmt.Sprintf("%s/%s", apiGroup, resource)

				// Add namespaces if specified
				if len(storedBP.Namespaces) > 0 {
					for _, ns := range storedBP.Namespaces {
						workloads = append(workloads, fmt.Sprintf("%s (ns:%s)", workloadType, ns))
					}
				} else {
					workloads = append(workloads, workloadType)
				}
			}
		}
	} else {
		// Try to extract from the API object (fallback)
		fmt.Printf("Debug - Extracting data from API object\n")
		clusters = extractTargetClusters(bp)
		workloads = extractWorkloads(bp)
	}

	ctx.JSON(http.StatusOK, gin.H{
		"name":        bp.Name,
		"namespace":   bp.Namespace,
		"status":      status,
		"conditions":  bp.Status.Conditions,
		"bindingMode": "Downsync", // KubeStellar only supports Downsync currently
		"clusters":    clusters,
		"workloads":   workloads,
	})
}

// getClientForBp creates a new client for BindingPolicy operations
func getClientForBp() (*bpv1alpha1.ControlV1alpha1Client, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	fmt.Printf("Debug - Using kubeconfig path: %s\n", kubeconfig)

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		fmt.Printf("Debug - LoadFromFile error: %v\n", err)
		return nil, err
	}

	wds_ctx := os.Getenv("wds_context")
	if wds_ctx == "" {
		return nil, fmt.Errorf("env var wds_context not set")
	}
	fmt.Printf("Debug - Using context: %s\n", wds_ctx)

	overrides := &clientcmd.ConfigOverrides{
		CurrentContext: wds_ctx,
	}
	cconfig := clientcmd.NewDefaultClientConfig(*config, overrides)

	restcnfg, err := cconfig.ClientConfig()
	if err != nil {
		fmt.Printf("Debug - ClientConfig error: %v\n", err)
		return nil, err
	}

	c, err := bpv1alpha1.NewForConfig(restcnfg)
	if err != nil {
		fmt.Printf("Debug - NewForConfig error: %v\n", err)
		return nil, err
	}

	return c, nil
}
