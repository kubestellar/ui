package bp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/log"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

type StoredBindingPolicy struct {
	Name              string              `json:"name"`
	Namespace         string              `json:"namespace"`
	ClusterSelectors  []map[string]string `json:"clusterSelectors"` // Each entry is matchLabels map
	APIGroups         []string            `json:"apiGroups"`
	Resources         []string            `json:"resources"`
	Namespaces        []string            `json:"namespaces"`
	SpecificWorkloads []WorkloadInfo      `json:"specificWorkloads"` // Added this field
	RawYAML           string              `json:"rawYAML"`
}
type WorkloadInfo struct {
	APIVersion string `json:"apiVersion"`
	Kind       string `json:"kind"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
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
	log.LogDebug("retrieving all binding policies")
	log.LogDebug("Using wds context: ", zap.String("wds_context", os.Getenv("wds_context")))

	c, err := getClientForBp()
	if err != nil {
		log.LogError("failed to create client for Bp", zap.String("error", err.Error()))
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
			log.LogError("Yaml Marshal faled", zap.String("error", err.Error()))
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
		log.LogDebug("filtering by namespace", zap.String("namespace", namespace))
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

// CreateBp creates a new BindingPolicy
// CreateBp creates a new BindingPolicy
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

	// First parse YAML into a map to extract basic metadata
	var yamlMap map[string]interface{}
	if err := yaml.Unmarshal(bpYamlBytes, &yamlMap); err != nil {
		fmt.Printf("Debug - Initial YAML parsing error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid YAML format: %s", err.Error())})
		return
	}

	// Extract specific workloads information if present
	specificWorkloads := []WorkloadInfo{}
	if specObj, ok := yamlMap["spec"].(map[interface{}]interface{}); ok {
		if workloadsList, ok := specObj["workloads"].([]interface{}); ok {
			fmt.Printf("Debug - Found workloads section with %d entries\n", len(workloadsList))

			for i, workloadObj := range workloadsList {
				if workload, ok := workloadObj.(map[interface{}]interface{}); ok {
					// Extract apiVersion
					apiVersion := ""
					if av, ok := workload["apiVersion"].(string); ok {
						apiVersion = av
					}

					// Extract kind
					kind := ""
					if k, ok := workload["kind"].(string); ok {
						kind = k
					}

					// Extract name and namespace
					name := ""
					namespace := ""
					if metaObj, ok := workload["metadata"].(map[interface{}]interface{}); ok {
						if n, ok := metaObj["name"].(string); ok {
							name = n
						}
						if ns, ok := metaObj["namespace"].(string); ok {
							namespace = ns
						}
					}

					if apiVersion != "" && kind != "" {
						workloadInfo := WorkloadInfo{
							APIVersion: apiVersion,
							Kind:       kind,
							Name:       name,
							Namespace:  namespace,
						}
						specificWorkloads = append(specificWorkloads, workloadInfo)
						fmt.Printf("Debug - Added specific workload #%d: %s/%s: %s (ns:%s)\n",
							i, apiVersion, kind, name, namespace)
					}
				}
			}
		}
	}

	// Extract and validate critical fields
	metadataMap, ok := yamlMap["metadata"].(map[interface{}]interface{})
	if !ok {
		fmt.Printf("Debug - No metadata found in YAML\n")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata section is required in binding policy"})
		return
	}

	// Extract name - this is required
	name, ok := metadataMap["name"].(string)
	if !ok || name == "" {
		fmt.Printf("Debug - Missing required name in metadata\n")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata.name is required and cannot be empty"})
		return
	}

	// Extract namespace (default to "default" if not provided)
	namespace := "default"
	if ns, ok := metadataMap["namespace"].(string); ok && ns != "" {
		namespace = ns
	}

	fmt.Printf("Debug - Extracted name: %s, namespace: %s\n", name, namespace)

	// Create a KubeStellar BindingPolicy object with proper TypeMeta/ObjectMeta
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

	// Now parse the full YAML into the binding policy
	if err := yaml.Unmarshal(bpYamlBytes, newBP); err != nil {
		fmt.Printf("Debug - Full YAML parsing error: %v\n", err)
		// Continue anyway, we'll fix what we can
	}

	// Double-check that we didn't lose the name/namespace during unmarshal
	if newBP.Name == "" {
		newBP.Name = name
	}

	if newBP.Namespace == "" {
		newBP.Namespace = namespace
	}

	// Fix downsync fields - ensure APIGroup is never empty
	for i, ds := range newBP.Spec.Downsync {
		// If APIGroup is empty, set it to "core" (for core resources)
		if ds.APIGroup == nil || *ds.APIGroup == "" {
			coreGroup := "core"
			newBP.Spec.Downsync[i].APIGroup = &coreGroup
			fmt.Printf("Debug - Fixed empty APIGroup in downsync[%d] to 'core'\n", i)
		}

		// Make sure namespaces is not empty if specified
		if len(ds.Namespaces) == 0 {
			// Default to the binding policy's namespace if not specified
			newBP.Spec.Downsync[i].Namespaces = []string{newBP.Namespace}
			fmt.Printf("Debug - Added default namespace '%s' to downsync[%d]\n", newBP.Namespace, i)
		}
	}

	// Create StoredBindingPolicy for cache
	storedBP := &StoredBindingPolicy{
		Name:              newBP.Name,
		Namespace:         newBP.Namespace,
		ClusterSelectors:  []map[string]string{},
		APIGroups:         []string{},
		Resources:         []string{},
		Namespaces:        []string{},
		SpecificWorkloads: specificWorkloads, // Add specific workloads
		RawYAML:           rawYAML,
	}

	// Extract cluster selectors for storage
	for _, selector := range newBP.Spec.ClusterSelectors {
		stringMap := make(map[string]string)
		for k, v := range selector.MatchLabels {
			stringMap[k] = v
		}
		storedBP.ClusterSelectors = append(storedBP.ClusterSelectors, stringMap)
	}

	// Extract downsync rules for storage
	for _, ds := range newBP.Spec.Downsync {
		if ds.APIGroup != nil {
			storedBP.APIGroups = append(storedBP.APIGroups, *ds.APIGroup)
		}

		storedBP.Resources = append(storedBP.Resources, ds.Resources...)
		storedBP.Namespaces = append(storedBP.Namespaces, ds.Namespaces...)
	}

	// Verify object before submission
	if newBP.Name == "" {
		fmt.Printf("Debug - ERROR: Name is still empty after fixes!\n")
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Failed to set binding policy name"})
		return
	}

	// Recreate YAML from our fixed object for debugging
	fixedYAML, _ := yaml.Marshal(newBP)
	fmt.Printf("Debug - Fixed YAML to submit:\n%s\n", string(fixedYAML))

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Store policy before API call
	uiCreatedPolicies[newBP.Name] = storedBP
	fmt.Printf("Debug - Stored policy in memory cache with key: %s\n", newBP.Name)

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

	// Extract clusters directly from stored data for immediate response
	clusters := []string{}
	for _, selector := range storedBP.ClusterSelectors {
		if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
			fmt.Printf("Debug - Adding cluster %s to response\n", clusterName)
			clusters = append(clusters, clusterName)
		}
	}

	// Extract workloads from stored data
	workloads := []string{}
	// 1. First add the downsync workloads
	for i, apiGroup := range storedBP.APIGroups {
		if i < len(storedBP.Resources) {
			// Convert resource to lowercase for consistent handling
			resourceLower := strings.ToLower(storedBP.Resources[i])
			workloadType := fmt.Sprintf("%s/%s", apiGroup, resourceLower)

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

	// 2. Now add the specific workloads
	for _, workload := range storedBP.SpecificWorkloads {
		workloadDesc := fmt.Sprintf("Specific: %s/%s", workload.APIVersion, workload.Kind)
		if workload.Name != "" {
			workloadDesc += fmt.Sprintf(": %s", workload.Name)
		}
		if workload.Namespace != "" {
			workloadDesc += fmt.Sprintf(" (ns:%s)", workload.Namespace)
		}
		workloads = append(workloads, workloadDesc)
	}

	fmt.Printf("Debug - Response clusters: %v\n", clusters)
	fmt.Printf("Debug - Response workloads: %v\n", workloads)
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
	name := ctx.Param("name")

	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name parameter is required"})
		return
	}
	log.LogInfo("", zap.String("deleting bp: ", name))
	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = c.BindingPolicies().Delete(context.TODO(), name, v1.DeleteOptions{})
	if err != nil {
		log.LogError("", zap.String("err", err.Error()))
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("failed to delte Bp: %s", name),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("deleted %s", name)})

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
		namespace = "default" // Set default namespace
	}

	fmt.Printf("Debug - GetBpStatus - Using namespace: '%s'\n", namespace)

	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - GetBpStatus - Client error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Try to get binding policy directly
	bp, err := c.BindingPolicies().Get(context.TODO(), name, v1.GetOptions{})
	if err != nil {
		fmt.Printf("Debug - GetBpStatus - Direct Get error: %v\n", err)

		// Try to list all binding policies to see if it exists
		bpList, listErr := c.BindingPolicies().List(context.TODO(), v1.ListOptions{})
		if listErr != nil {
			fmt.Printf("Debug - GetBpStatus - List error: %v\n", listErr)
			ctx.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Binding policy '%s' not found and failed to list policies: %v", name, listErr),
			})
			return
		}

		// Check if we can find the policy with the given name
		var foundBP *v1alpha1.BindingPolicy
		fmt.Printf("Debug - GetBpStatus - Listing all BPs to find '%s'\n", name)
		for i, item := range bpList.Items {
			fmt.Printf("Debug - BP #%d: %s/%s\n", i, item.Namespace, item.Name)
			if item.Name == name {
				foundBP = &bpList.Items[i]
				break
			}
		}

		if foundBP == nil {
			ctx.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Binding policy '%s' not found in any namespace", name),
			})
			return
		}

		bp = foundBP
		fmt.Printf("Debug - GetBpStatus - Found BP with matching name in namespace '%s'\n", bp.Namespace)
	}

	// Look for this binding policy in the uiCreatedPolicies map
	storedBP, exists := uiCreatedPolicies[name]
	if exists {
		fmt.Printf("Debug - GetBpStatus - Found stored BP in memory with key: %s\n", name)
		// Debug the stored policy
		fmt.Printf("Debug - Stored BP ClusterSelectors: %+v\n", storedBP.ClusterSelectors)
	} else {
		fmt.Printf("Debug - GetBpStatus - No stored BP found in memory with key: %s\n", name)
	}

	// Determine if the policy is active based on status fields
	status := "inactive"

	// Check if any conditions are present and if Synced and Ready are True
	hasSync := false
	hasReady := false

	if bp.Status.Conditions != nil {
		for _, condition := range bp.Status.Conditions {
			if condition.Type == "Synced" && condition.Status == "True" {
				hasSync = true
			}
			if condition.Type == "Ready" && condition.Status == "True" {
				hasReady = true
			}
		}
	}

	if hasSync && hasReady {
		status = "active"
	}

	// Initialize clusters and workloads slices
	clusters := []string{}
	workloads := []string{}

	// If we have a stored policy with cluster selectors, use that
	if exists && len(storedBP.ClusterSelectors) > 0 {
		fmt.Printf("Debug - Using cluster selectors from stored policy\n")
		for i, selector := range storedBP.ClusterSelectors {
			if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
				fmt.Printf("Debug - Found cluster from stored data: %s\n", clusterName)
				clusters = append(clusters, clusterName)
			} else {
				fmt.Printf("Debug - Selector #%d has no kubernetes.io/cluster-name: %+v\n", i, selector)
			}
		}

		// Use stored API groups and resources
		for i, apiGroup := range storedBP.APIGroups {
			if i < len(storedBP.Resources) {
				// Convert resource to lowercase for consistent handling
				resourceLower := strings.ToLower(storedBP.Resources[i])
				workloadType := fmt.Sprintf("%s/%s", apiGroup, resourceLower)

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

		// Add specific workloads from stored data
		for _, workload := range storedBP.SpecificWorkloads {
			workloadDesc := fmt.Sprintf("Specific: %s/%s", workload.APIVersion, workload.Kind)
			if workload.Name != "" {
				workloadDesc += fmt.Sprintf(": %s", workload.Name)
			}
			if workload.Namespace != "" {
				workloadDesc += fmt.Sprintf(" (ns:%s)", workload.Namespace)
			}
			fmt.Printf("Debug - Adding specific workload from storage: %s\n", workloadDesc)
			workloads = append(workloads, workloadDesc)
		}
	} else {
		// Try to extract from the API response
		fmt.Printf("Debug - Trying to extract from API response\n")

		// Extract clusters from BP
		for i, selector := range bp.Spec.ClusterSelectors {
			if selector.MatchLabels == nil {
				continue
			}

			fmt.Printf("Debug - Processing selector #%d for clusters: %+v\n", i, selector.MatchLabels)

			// Check for kubernetes.io/cluster-name label
			if clusterName, ok := selector.MatchLabels["kubernetes.io/cluster-name"]; ok {
				fmt.Printf("Debug - Found cluster from API: %s\n", clusterName)
				clusters = append(clusters, clusterName)
			}
		}

		// Extract workloads from BP
		for i, ds := range bp.Spec.Downsync {
			apiGroupValue := "core" // Default to core
			if ds.APIGroup != nil && *ds.APIGroup != "" {
				apiGroupValue = *ds.APIGroup
			}

			fmt.Printf("Debug - Downsync #%d: APIGroup=%s, Resources=%v, Namespaces=%v\n",
				i, apiGroupValue, ds.Resources, ds.Namespaces)

			for _, resource := range ds.Resources {
				// Convert resource to lowercase for consistent handling
				resourceLower := strings.ToLower(resource)
				workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resourceLower)

				if len(ds.Namespaces) > 0 {
					for _, ns := range ds.Namespaces {
						workloads = append(workloads, fmt.Sprintf("%s (ns:%s)", workloadType, ns))
					}
				} else {
					workloads = append(workloads, workloadType)
				}
			}
		}

		// Note: We've removed the section that tried to access bp.Spec.Workloads
		// since that field doesn't exist in the KubeStellar API
	}

	// If we still don't have clusters or workloads, try to parse the stored rawYAML if available
	if (len(clusters) == 0 || len(workloads) == 0) && exists && storedBP.RawYAML != "" {
		fmt.Printf("Debug - Trying to parse stored raw YAML\n")
		// Parse the raw YAML to extract information
		var yamlMap map[string]interface{}
		if err := yaml.Unmarshal([]byte(storedBP.RawYAML), &yamlMap); err != nil {
			fmt.Printf("Debug - Failed to parse raw YAML: %v\n", err)
		} else {
			// Try to extract cluster selectors from YAML
			if spec, ok := yamlMap["spec"].(map[interface{}]interface{}); ok {
				if selectors, ok := spec["clusterSelectors"].([]interface{}); ok {
					fmt.Printf("Debug - Found %d cluster selectors in YAML\n", len(selectors))
					for _, selectorObj := range selectors {
						if selector, ok := selectorObj.(map[interface{}]interface{}); ok {
							if matchLabels, ok := selector["matchLabels"].(map[interface{}]interface{}); ok {
								for k, v := range matchLabels {
									if kStr, ok := k.(string); ok && kStr == "kubernetes.io/cluster-name" {
										if vStr, ok := v.(string); ok {
											fmt.Printf("Debug - Found cluster from YAML: %s\n", vStr)
											// Check if already in the list
											alreadyExists := false
											for _, c := range clusters {
												if c == vStr {
													alreadyExists = true
													break
												}
											}
											if !alreadyExists {
												clusters = append(clusters, vStr)
											}
										}
									}
								}
							}
						}
					}
				}

				// Try to extract downsync resources from YAML
				if downsyncList, ok := spec["downsync"].([]interface{}); ok {
					fmt.Printf("Debug - Found %d downsync entries in YAML\n", len(downsyncList))
					for _, downsyncObj := range downsyncList {
						if downsync, ok := downsyncObj.(map[interface{}]interface{}); ok {
							// Extract API group
							apiGroupValue := "core" // Default
							if apiGroup, ok := downsync["apiGroup"].(string); ok && apiGroup != "" {
								apiGroupValue = apiGroup
							}

							// Extract resources
							var resources []string
							if rawResources, ok := downsync["resources"].([]interface{}); ok {
								for _, r := range rawResources {
									if resource, ok := r.(string); ok {
										// Convert resource to lowercase
										resourceLower := strings.ToLower(resource)
										resources = append(resources, resourceLower)
									}
								}
							}

							// Extract namespaces
							var namespaces []string
							if rawNamespaces, ok := downsync["namespaces"].([]interface{}); ok {
								for _, n := range rawNamespaces {
									if ns, ok := n.(string); ok {
										namespaces = append(namespaces, ns)
									}
								}
							}

							// Create workload entries
							for _, resource := range resources {
								workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resource)

								if len(namespaces) > 0 {
									for _, ns := range namespaces {
										workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, ns)
										// Check if already in the list
										alreadyExists := false
										for _, w := range workloads {
											if w == workloadItem {
												alreadyExists = true
												break
											}
										}
										if !alreadyExists {
											workloads = append(workloads, workloadItem)
										}
									}
								} else {
									// Check if already in the list
									alreadyExists := false
									for _, w := range workloads {
										if w == workloadType {
											alreadyExists = true
											break
										}
									}
									if !alreadyExists {
										workloads = append(workloads, workloadType)
									}
								}
							}
						}
					}
				}

				// Try to extract specific workloads from YAML
				if workloadsList, ok := spec["workloads"].([]interface{}); ok {
					fmt.Printf("Debug - Found %d specific workloads in YAML\n", len(workloadsList))
					for i, workloadObj := range workloadsList {
						if workload, ok := workloadObj.(map[interface{}]interface{}); ok {
							// Extract apiVersion
							apiVersion := "unknown"
							if av, ok := workload["apiVersion"].(string); ok {
								apiVersion = av
							}

							// Extract kind
							kind := "unknown"
							if k, ok := workload["kind"].(string); ok {
								kind = k
							}

							// Extract name and namespace from metadata
							name := ""
							namespace := ""
							if metaObj, ok := workload["metadata"].(map[interface{}]interface{}); ok {
								if n, ok := metaObj["name"].(string); ok {
									name = n
								}
								if ns, ok := metaObj["namespace"].(string); ok {
									namespace = ns
								}
							}

							// Only add if we have at least some identifying information
							if name != "" || (apiVersion != "unknown" && kind != "unknown") {
								workloadDesc := fmt.Sprintf("Specific: %s/%s", apiVersion, kind)
								if name != "" {
									workloadDesc += fmt.Sprintf(": %s", name)
								}
								if namespace != "" {
									workloadDesc += fmt.Sprintf(" (ns:%s)", namespace)
								}

								fmt.Printf("Debug - Found specific workload #%d in YAML: %s\n", i, workloadDesc)

								// Check if already in the list
								alreadyExists := false
								for _, w := range workloads {
									if w == workloadDesc {
										alreadyExists = true
										break
									}
								}
								if !alreadyExists {
									workloads = append(workloads, workloadDesc)
								}
							}
						}
					}
				}
			}
		}
	}

	// Print debug info before returning
	fmt.Printf("Debug - Returning response - name: %s, namespace: %s\n", bp.Name, bp.Namespace)
	fmt.Printf("Debug - Returning %d clusters: %v\n", len(clusters), clusters)
	fmt.Printf("Debug - Returning %d workloads: %v\n", len(workloads), workloads)

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

// Updates the Binding policy with the given name, Assuming that it exists
func UpdateBp(ctx *gin.Context) {

	bpName := ctx.Param("name")
	if bpName == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "expected name for Binding policy"})
		return
	}
	jsonBytes, err := ctx.GetRawData()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	updatedBp, err := c.BindingPolicies().Patch(context.TODO(), bpName, types.MergePatchType, jsonBytes, v1.PatchOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("updated %s", updatedBp.Name)})

}
