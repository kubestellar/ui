package bp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

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

		// Extract target clusters from ClusterSelectors and try multiple sources for completeness
		clusters := extractTargetClusters(&bpList.Items[i])

		// Check if we have stored data for this policy that might have more details
		policyName := bpList.Items[i].Name
		storedBP, exists := uiCreatedPolicies[policyName]

		if exists {
			fmt.Printf("Debug - GetAllBp - Found stored BP in memory with key: %s\n", policyName)
			// Use the stored cluster selectors for more detailed information
			if len(storedBP.ClusterSelectors) > 0 {
				for _, selector := range storedBP.ClusterSelectors {
					if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
						// Check if already in the clusters array
						if !contains(clusters, clusterName) {
							clusters = append(clusters, clusterName)
							fmt.Printf("Debug - GetAllBp - Added cluster from stored data: %s\n", clusterName)
						}
					}
				}
			}

			// If we still have no clusters but have YAML data, try to parse it
			if len(clusters) == 0 && storedBP.RawYAML != "" {
				fmt.Printf("Debug - GetAllBp - Trying to parse stored raw YAML for clusters\n")
				var yamlMap map[string]interface{}
				if err := yaml.Unmarshal([]byte(storedBP.RawYAML), &yamlMap); err == nil {
					if spec, ok := yamlMap["spec"].(map[interface{}]interface{}); ok {
						if selectors, ok := spec["clusterSelectors"].([]interface{}); ok {
							for _, selectorObj := range selectors {
								if selector, ok := selectorObj.(map[interface{}]interface{}); ok {
									if matchLabels, ok := selector["matchLabels"].(map[interface{}]interface{}); ok {
										for k, v := range matchLabels {
											if kStr, ok := k.(string); ok && kStr == "kubernetes.io/cluster-name" {
												if vStr, ok := v.(string); ok && !contains(clusters, vStr) {
													clusters = append(clusters, vStr)
													fmt.Printf("Debug - GetAllBp - Added cluster from YAML: %s\n", vStr)
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}

		// Extract workloads from Downsync using a comprehensive approach similar to GetBpStatus
		workloads := []string{}

		// If we have stored data for workloads, use it first for detailed information
		if exists {
			fmt.Printf("Debug - GetAllBp - Using stored policy data for workloads\n")
			// Try to use stored API groups and resources for more detail
			for i, apiGroup := range storedBP.APIGroups {
				if i < len(storedBP.Resources) {
					resourceLower := strings.ToLower(storedBP.Resources[i])
					workloadType := fmt.Sprintf("%s/%s", apiGroup, resourceLower)

					// Add namespaces if specified
					if len(storedBP.Namespaces) > 0 {
						for _, ns := range storedBP.Namespaces {
							workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, ns)
							if !contains(workloads, workloadItem) {
								workloads = append(workloads, workloadItem)
								fmt.Printf("Debug - GetAllBp - Added workload from stored data: %s\n", workloadItem)
							}
						}
					} else if !contains(workloads, workloadType) {
						workloads = append(workloads, workloadType)
						fmt.Printf("Debug - GetAllBp - Added workload from stored data: %s\n", workloadType)
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
				if !contains(workloads, workloadDesc) {
					workloads = append(workloads, workloadDesc)
					fmt.Printf("Debug - GetAllBp - Added specific workload from stored data: %s\n", workloadDesc)
				}
			}
		} else {
			// If no stored data, extract from BP directly
			fmt.Printf("Debug - GetAllBp - Extracting workloads from API response for %s\n", policyName)

			// Extract from the policy's downsync field
			for i, ds := range bpList.Items[i].Spec.Downsync {
				apiGroupValue := "core" // Default to core
				if ds.APIGroup != nil && *ds.APIGroup != "" {
					apiGroupValue = *ds.APIGroup
				}

				fmt.Printf("Debug - GetAllBp - Downsync #%d: APIGroup=%s, Resources=%v, Namespaces=%v\n",
					i, apiGroupValue, ds.Resources, ds.Namespaces)

				for _, resource := range ds.Resources {
					// Convert resource to lowercase for consistent handling
					resourceLower := strings.ToLower(resource)
					workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resourceLower)

					if len(ds.Namespaces) > 0 {
						for _, ns := range ds.Namespaces {
							workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, ns)
							if !contains(workloads, workloadItem) {
								workloads = append(workloads, workloadItem)
								fmt.Printf("Debug - GetAllBp - Added workload from API: %s\n", workloadItem)
							}
						}
					} else if !contains(workloads, workloadType) {
						workloads = append(workloads, workloadType)
						fmt.Printf("Debug - GetAllBp - Added workload from API: %s\n", workloadType)
					}
				}
			}

			// Try to extract from annotations if there's any workload info
			if annotations := bpList.Items[i].Annotations; annotations != nil {
				if specificWorkload, ok := annotations["specific-workload-name"]; ok && specificWorkload != "" {
					// Try to determine API group and kind from annotations
					apiVersion := annotations["workload-api-version"]
					if apiVersion == "" {
						apiVersion = "apps/v1" // Default to apps/v1 if not specified
					}

					kind := annotations["workload-kind"]
					if kind == "" {
						// Try to guess from the specific workload name pattern
						if strings.Contains(specificWorkload, "-deployment") {
							kind = "Deployment"
						} else if strings.Contains(specificWorkload, "-statefulset") {
							kind = "StatefulSet"
						} else {
							kind = "Deployment" // Default
						}
					}

					workloadNamespace := annotations["workload-namespace"]
					if workloadNamespace == "" {
						workloadNamespace = "default"
					}

					workloadDesc := fmt.Sprintf("Specific: %s/%s: %s (ns:%s)",
						apiVersion, kind, specificWorkload, workloadNamespace)

					if !contains(workloads, workloadDesc) {
						workloads = append(workloads, workloadDesc)
						fmt.Printf("Debug - GetAllBp - Added specific workload from annotations: %s\n", workloadDesc)
					}
				}

				// Check for workload-id annotation (used in quick binding policies)
				if workloadId, ok := annotations["workload-id"]; ok && workloadId != "" && !contains(workloads, workloadId) {
					workloads = append(workloads, workloadId)
					fmt.Printf("Debug - GetAllBp - Added workload from workload-id annotation: %s\n", workloadId)
				}
			}
		}

		// If we still don't have workloads, fallback to a general extraction method
		if len(workloads) == 0 {
			workloads = extractWorkloads(&bpList.Items[i])
		}

		// If still no workloads after all attempts, add a default
		if len(workloads) == 0 {
			workloads = append(workloads, "No workload specified")
			fmt.Printf("Debug - GetAllBp - No workloads found, adding default\n")
		}

		// Ensure we have cluster count consistent with the array
		clustersCount := len(clusters)

		// Set explicit cluster count for clarity in logs
		fmt.Printf("Debug - GetAllBp - Policy %s: Found %d clusters and %d workloads\n",
			policyName, clustersCount, len(workloads))

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

	// Before sending the response, ensure each policy has proper clustersCount and workloadsCount
	responseArray := make([]map[string]interface{}, len(bpsWithStatus))
	for i, bp := range bpsWithStatus {
		// Convert each binding policy to a map for customization
		policyMap := map[string]interface{}{
			"name":           bp.Name,
			"namespace":      bp.Namespace,
			"status":         bp.Status,
			"bindingMode":    bp.BindingMode,
			"clusters":       bp.Clusters,
			"clusterList":    bp.Clusters, // For backward compatibility
			"workloads":      bp.Workloads,
			"workloadList":   bp.Workloads,      // For backward compatibility
			"clustersCount":  len(bp.Clusters),  // Explicitly set based on clusters array
			"workloadsCount": len(bp.Workloads), // Explicitly set based on workloads array
			// Include other fields that might be needed in the response
			"creationTimestamp": bp.CreationTimestamp,
			"conditions":        bp.BindingPolicy.Status.Conditions,
			"yaml":              bp.Annotations["yaml"],
		}

		responseArray[i] = policyMap
	}

	ctx.JSON(http.StatusOK, gin.H{
		"bindingPolicies": responseArray,
		"count":           len(responseArray),
	})
}

// CreateBp creates a new BindingPolicy
func CreateBp(ctx *gin.Context) {

	log.LogInfo("starting Createbp handler",
		zap.String("wds_context", os.Getenv("wds_context")))
	// Check Content-Type header
	var bpRawYamlBytes []byte
	var err error
	contentType := ctx.ContentType()
	if !contentTypeValid(contentType) {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "content-type not supported"})
	}
	if contentType == "application/yaml" {
		bpRawYamlBytes, err = io.ReadAll(ctx.Request.Body)
		if err != nil {
			log.LogError("error reading yaml input", zap.String("error", err.Error()))
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if contentType == "multipart/form-data" {
		// Get the form file
		file, err := ctx.FormFile("bpYaml")
		if err != nil {
			log.LogError("failed to get form file", zap.String("err", err.Error()))
			ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to get form file: %s", err.Error())})
			return
		}

		fmt.Printf("Debug - Received file: %s\n", file.Filename)

		// Open and read the file
		f, err := file.Open()
		if err != nil {
			log.LogError("failed to open file", zap.String("err", err.Error()))
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to open file: %s", err.Error())})
			return
		}
		defer f.Close()

		// Read file contents
		bpRawYamlBytes, err = io.ReadAll(f)
		if err != nil {
			log.LogError("failed to read bp yaml file", zap.String("err", err.Error()))
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read file: %s", err.Error())})
			return
		}
		log.LogInfo("received bp yaml file")
		log.LogInfo(string(bpRawYamlBytes))
	}

	// First parse YAML into a map to extract basic metadata
	var yamlMap map[string]interface{}
	if err := yaml.Unmarshal(bpRawYamlBytes, &yamlMap); err != nil {
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
	if err := yaml.Unmarshal(bpRawYamlBytes, newBP); err != nil {
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
		RawYAML:           string(bpRawYamlBytes),
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
			"name":           createdBP.Name,
			"namespace":      createdBP.Namespace,
			"status":         "inactive", // New policies start as inactive
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       clusters,
			"workloads":      workloads,
			"clustersCount":  len(clusters),
			"workloadsCount": len(workloads),
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
					workloads = append(workloads, workloadType)
				}
			}
		}

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
		"name":              bp.Name,
		"namespace":         bp.Namespace,
		"status":            status,
		"conditions":        bp.Status.Conditions,
		"bindingMode":       "Downsync", // KubeStellar only supports Downsync currently
		"clusters":          clusters,
		"workloads":         workloads,
		"clustersCount":     len(clusters),
		"workloadsCount":    len(workloads),
		"creationTimestamp": bp.CreationTimestamp,   // Add creation timestamp for consistency with GetAllBp
		"yaml":              bp.Annotations["yaml"], // Also include YAML for completeness
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

// CreateBpFromJson creates a new BindingPolicy from JSON data sent by the UI
func CreateBpFromJson(ctx *gin.Context) {
	fmt.Printf("Debug - Starting CreateBpFromJson handler\n")
	fmt.Printf("Debug - KUBECONFIG: %s\n", os.Getenv("KUBECONFIG"))
	fmt.Printf("Debug - wds_context: %s\n", os.Getenv("wds_context"))

	// Check Content-Type header
	contentType := ctx.GetHeader("Content-Type")
	fmt.Printf("Debug - Content-Type: %s\n", contentType)
	if !strings.Contains(contentType, "application/json") {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Content-Type must be application/json"})
		return
	}

	// Define a struct to parse the incoming JSON data
	type BindingPolicyRequest struct {
		Name              string              `json:"name"`
		Namespace         string              `json:"namespace"`
		ClusterSelectors  []map[string]string `json:"clusterSelectors"`
		WorkloadSelectors struct {
			ApiGroups  []string       `json:"apiGroups"`
			Resources  []string       `json:"resources"`
			Namespaces []string       `json:"namespaces"`
			Workloads  []WorkloadInfo `json:"workloads"`
		} `json:"workloadSelectors"`
		PropagationMode string            `json:"propagationMode"`
		UpdateStrategy  string            `json:"updateStrategy"`
		SchedulingRules []map[string]any  `json:"schedulingRules"`
		Tolerations     []map[string]any  `json:"tolerations"`
		CustomLabels    map[string]string `json:"customLabels"`
		ClusterId       string            `json:"clusterId"`
		WorkloadId      string            `json:"workloadId"`
	}

	var bpRequest BindingPolicyRequest
	if err := ctx.ShouldBindJSON(&bpRequest); err != nil {
		fmt.Printf("Debug - JSON binding error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	// Validate required fields
	if bpRequest.Name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	if bpRequest.Namespace == "" {
		bpRequest.Namespace = "default" // Default namespace if not provided
	}

	fmt.Printf("Debug - Received policy request: %+v\n", bpRequest)

	// Create a KubeStellar BindingPolicy using a generic approach
	// type policyMatchLabels struct {
	// 	MatchLabels map[string]string `json:"matchLabels,omitempty"`
	// }

	// type policyDownsyncRule struct {
	// 	APIGroup   *string  `json:"apiGroup,omitempty"`
	// 	Resources  []string `json:"resources,omitempty"`
	// 	Namespaces []string `json:"namespaces,omitempty"`
	// }

	// Create a policy as a generic map that we'll convert to YAML
	policyObj := map[string]interface{}{
		"apiVersion": "control.kubestellar.io/v1alpha1",
		"kind":       "BindingPolicy",
		"metadata": map[string]interface{}{
			"name":      bpRequest.Name,
			"namespace": bpRequest.Namespace,
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{},
			"downsync":         []interface{}{},
		},
	}

	// Add cluster selectors
	clusterSelectors := []interface{}{}
	for _, selector := range bpRequest.ClusterSelectors {
		clusterSelectors = append(clusterSelectors, map[string]interface{}{
			"matchLabels": selector,
		})
	}

	// If ClusterId is provided directly, add it as a selector
	if bpRequest.ClusterId != "" {
		// Check if we already have a selector for this cluster
		hasClusterSelector := false
		for _, selector := range clusterSelectors {
			if s, ok := selector.(map[string]interface{}); ok {
				if matchLabels, ok := s["matchLabels"].(map[string]string); ok {
					if clusterName, ok := matchLabels["kubernetes.io/cluster-name"]; ok && clusterName == bpRequest.ClusterId {
						hasClusterSelector = true
						break
					}
				}
			}
		}

		if !hasClusterSelector {
			clusterSelectors = append(clusterSelectors, map[string]interface{}{
				"matchLabels": map[string]string{
					"kubernetes.io/cluster-name": bpRequest.ClusterId,
				},
			})
		}
	}

	// Set the cluster selectors in the policy object
	policyObj["spec"].(map[string]interface{})["clusterSelectors"] = clusterSelectors

	// Add downsync rules for API groups and resources
	downsyncRules := []interface{}{}
	for i, apiGroup := range bpRequest.WorkloadSelectors.ApiGroups {
		if i < len(bpRequest.WorkloadSelectors.Resources) {
			resource := bpRequest.WorkloadSelectors.Resources[i]

			// Create a downsync entry
			apiGroupCopy := apiGroup // Copy to avoid reference issues
			namespaces := bpRequest.WorkloadSelectors.Namespaces

			// If no namespaces provided, use the binding policy namespace
			if len(namespaces) == 0 {
				namespaces = []string{bpRequest.Namespace}
			}

			// Make sure apiGroup is never empty
			if apiGroupCopy == "" {
				apiGroupCopy = "core"
			}
			downsyncRules = append(downsyncRules, map[string]interface{}{
				"apiGroup":   apiGroupCopy,
				"resources":  []string{resource},
				"namespaces": namespaces,
			})
		}
	}

	// Add specific workloads if provided
	for _, workload := range bpRequest.WorkloadSelectors.Workloads {
		// Skip if essential fields are missing
		if workload.APIVersion == "" || workload.Kind == "" || workload.Name == "" {
			continue
		}

		// Handle namespace (use the workload's namespace or the binding policy namespace)
		namespace := workload.Namespace
		if namespace == "" {
			namespace = bpRequest.Namespace
		}

		// Extract API group and version from apiVersion (e.g., "apps/v1" -> "apps")
		apiGroupValue := "core" // Default for core resources
		if strings.Contains(workload.APIVersion, "/") {
			parts := strings.Split(workload.APIVersion, "/")
			apiGroupValue = parts[0]
		}

		// Add this to the metadata for tracking
		metadata := policyObj["metadata"].(map[string]interface{})
		if metadata["annotations"] == nil {
			metadata["annotations"] = map[string]string{}
		}
		annotations := metadata["annotations"].(map[string]string)
		annotations["specificWorkloads"] = fmt.Sprintf("%s,%s,%s,%s",
			workload.APIVersion, workload.Kind, workload.Name, namespace)

		// Create a downsync entry for this specific workload type if not already added
		resourceName := strings.ToLower(workload.Kind) + "s" // Convert to plural form

		// Check if this resource already exists in the downsync rules
		resourceExists := false
		for _, rule := range downsyncRules {
			if r, ok := rule.(map[string]interface{}); ok {
				if ag, ok := r["apiGroup"].(string); ok && ag == apiGroupValue {
					if resources, ok := r["resources"].([]string); ok {
						for _, res := range resources {
							if res == resourceName {
								if ns, ok := r["namespaces"].([]string); ok {
									for _, n := range ns {
										if n == namespace {
											resourceExists = true
											break
										}
									}
								}
							}
						}
					}
				}
			}
		}

		// If not already added, create a new downsync entry
		if !resourceExists {
			// Make sure apiGroup is never empty
			if apiGroupValue == "" {
				apiGroupValue = "core"
			}
			downsyncRules = append(downsyncRules, map[string]interface{}{
				"apiGroup":   apiGroupValue,
				"resources":  []string{resourceName},
				"namespaces": []string{namespace},
			})
		}
	}

	// Set the downsync rules in the policy object
	policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules

	// Add custom labels if provided
	if len(bpRequest.CustomLabels) > 0 {
		metadata := policyObj["metadata"].(map[string]interface{})
		metadata["labels"] = bpRequest.CustomLabels
	}

	// Add annotations for propagation mode and update strategy if provided
	if bpRequest.PropagationMode != "" || bpRequest.UpdateStrategy != "" {
		metadata := policyObj["metadata"].(map[string]interface{})
		if metadata["annotations"] == nil {
			metadata["annotations"] = map[string]string{}
		}
		annotations := metadata["annotations"].(map[string]string)

		if bpRequest.PropagationMode != "" {
			annotations["propagationMode"] = bpRequest.PropagationMode
		}
		if bpRequest.UpdateStrategy != "" {
			annotations["updateStrategy"] = bpRequest.UpdateStrategy
		}
	}

	// Generate YAML for the policy object
	yamlData, err := yaml.Marshal(policyObj)
	if err != nil {
		fmt.Printf("Debug - YAML marshaling error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	fmt.Printf("Debug - Generated YAML:\n%s\n", rawYAML)

	// Now parse back into a BindingPolicy struct
	newBP := &v1alpha1.BindingPolicy{}
	if err := yaml.Unmarshal(yamlData, newBP); err != nil {
		fmt.Printf("Debug - Error parsing generated YAML back into BindingPolicy: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to parse generated YAML: %s", err.Error())})
		return
	}

	// Ensure the name is set
	if newBP.Name == "" {
		newBP.Name = bpRequest.Name
		fmt.Printf("Debug - Name was empty, setting to: %s\n", bpRequest.Name)
	}

	// Ensure each downsync rule has a non-empty apiGroup
	for i := range newBP.Spec.Downsync {
		if newBP.Spec.Downsync[i].APIGroup == nil || *newBP.Spec.Downsync[i].APIGroup == "" {
			coreGroup := "core"
			newBP.Spec.Downsync[i].APIGroup = &coreGroup
			fmt.Printf("Debug - Fixed empty APIGroup in downsync[%d] to 'core'\n", i)
		}
	}

	// Create a StoredBindingPolicy for cache
	storedBP := &StoredBindingPolicy{
		Name:              newBP.Name,
		Namespace:         newBP.Namespace,
		ClusterSelectors:  bpRequest.ClusterSelectors,
		APIGroups:         bpRequest.WorkloadSelectors.ApiGroups,
		Resources:         bpRequest.WorkloadSelectors.Resources,
		Namespaces:        bpRequest.WorkloadSelectors.Namespaces,
		SpecificWorkloads: bpRequest.WorkloadSelectors.Workloads,
		RawYAML:           rawYAML,
	}

	// Store policy before API call
	uiCreatedPolicies[newBP.Name] = storedBP
	fmt.Printf("Debug - Stored policy in memory cache with key: %s\n", newBP.Name)

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Create the binding policy
	_, err = c.BindingPolicies().Create(context.TODO(), newBP, v1.CreateOptions{})
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

	// Extract clusters for response
	clusters := []string{}
	for _, selector := range bpRequest.ClusterSelectors {
		if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
			clusters = append(clusters, clusterName)
		}
	}
	// Add cluster from direct clusterId if available
	if bpRequest.ClusterId != "" && !contains(clusters, bpRequest.ClusterId) {
		clusters = append(clusters, bpRequest.ClusterId)
	}

	// Extract workloads for response
	workloads := []string{}
	for i, apiGroup := range bpRequest.WorkloadSelectors.ApiGroups {
		if i < len(bpRequest.WorkloadSelectors.Resources) {
			resourceLower := strings.ToLower(bpRequest.WorkloadSelectors.Resources[i])
			workloadType := fmt.Sprintf("%s/%s", apiGroup, resourceLower)

			if len(bpRequest.WorkloadSelectors.Namespaces) > 0 {
				for _, ns := range bpRequest.WorkloadSelectors.Namespaces {
					workloads = append(workloads, fmt.Sprintf("%s (ns:%s)", workloadType, ns))
				}
			} else {
				workloads = append(workloads, workloadType)
			}
		}
	}
	for _, workload := range bpRequest.WorkloadSelectors.Workloads {
		workloadDesc := fmt.Sprintf("Specific: %s/%s", workload.APIVersion, workload.Kind)
		if workload.Name != "" {
			workloadDesc += fmt.Sprintf(": %s", workload.Name)
		}
		if workload.Namespace != "" {
			workloadDesc += fmt.Sprintf(" (ns:%s)", workload.Namespace)
		}
		workloads = append(workloads, workloadDesc)
	}

	// Add workload from direct workloadId if available
	if bpRequest.WorkloadId != "" {
		workloadDesc := fmt.Sprintf("Specific: %s", bpRequest.WorkloadId)
		if !contains(workloads, workloadDesc) {
			workloads = append(workloads, workloadDesc)
		}
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Created binding policy '%s' in namespace '%s' successfully", newBP.Name, newBP.Namespace),
		"bindingPolicy": gin.H{
			"name":           newBP.Name,
			"namespace":      newBP.Namespace,
			"status":         "inactive", // New policies start as inactive
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       clusters,
			"workloads":      workloads,
			"clustersCount":  len(clusters),
			"workloadsCount": len(workloads),
			"yaml":           rawYAML,
		},
	})
}

// Helper function to check if a string is in a slice
func contains(slice []string, str string) bool {
	for _, item := range slice {
		if item == str {
			return true
		}
	}
	return false
}

// CreateQuickBindingPolicy creates a simple binding policy connecting a workload to a cluster
func CreateQuickBindingPolicy(ctx *gin.Context) {
	fmt.Printf("Debug - Starting CreateQuickBindingPolicy handler\n")

	// Define a struct to parse the quick connection request
	type QuickBindingPolicyRequest struct {
		WorkloadId string `json:"workloadId"` // The ID of the workload
		ClusterId  string `json:"clusterId"`  // The ID of the cluster
		PolicyName string `json:"policyName"` // Optional custom name for the policy
		Namespace  string `json:"namespace"`  // Optional namespace
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	// Validate required fields
	if request.WorkloadId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "workloadId is required"})
		return
	}

	if request.ClusterId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "clusterId is required"})
		return
	}

	// Set default namespace if not provided
	namespace := "default"
	if request.Namespace != "" {
		namespace = request.Namespace
	}

	// Generate a policy name if not provided
	policyName := request.PolicyName
	if policyName == "" {
		// Create a name based on workload and cluster IDs
		policyName = fmt.Sprintf("%s-to-%s", request.WorkloadId, request.ClusterId)
		// Clean up the name to be valid for Kubernetes
		policyName = strings.ReplaceAll(policyName, "/", "-")
		policyName = strings.ReplaceAll(policyName, ":", "-")
		policyName = strings.ToLower(policyName)
	}

	// Create a policy as a generic map that we'll convert to YAML
	policyObj := map[string]interface{}{
		"apiVersion": "control.kubestellar.io/v1alpha1",
		"kind":       "BindingPolicy",
		"metadata": map[string]interface{}{
			"name":      policyName,
			"namespace": namespace,
			"annotations": map[string]string{
				"created-by":         "kubestellar-ui-drag-drop",
				"workload-id":        request.WorkloadId,
				"cluster-id":         request.ClusterId,
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": map[string]string{
						"kubernetes.io/cluster-name": request.ClusterId,
					},
				},
			},
			"downsync": []interface{}{},
		},
	}

	// Parse workload ID to extract information
	// Format could be: Deployment/nginx or apps:v1:Deployment/nginx
	var apiGroup string = "core"
	var kind string
	var workloadName string

	if strings.Contains(request.WorkloadId, ":") {
		// Format: apps:v1:Deployment/nginx
		parts := strings.Split(request.WorkloadId, ":")
		if len(parts) >= 3 {
			apiGroup = parts[0]
			kind = parts[2]
			if strings.Contains(kind, "/") {
				kindParts := strings.Split(kind, "/")
				kind = kindParts[0]
				if len(kindParts) > 1 {
					workloadName = kindParts[1]
				}
			}
		}
	} else if strings.Contains(request.WorkloadId, "/") {
		// Format: Deployment/nginx
		parts := strings.Split(request.WorkloadId, "/")
		kind = parts[0]
		if len(parts) > 1 {
			workloadName = parts[1]
		}

		// Set default API group based on kind
		if strings.ToLower(kind) == "deployment" ||
			strings.ToLower(kind) == "statefulset" ||
			strings.ToLower(kind) == "daemonset" ||
			strings.ToLower(kind) == "replicaset" {
			apiGroup = "apps"
		} else if strings.ToLower(kind) == "job" || strings.ToLower(kind) == "cronjob" {
			apiGroup = "batch"
		}
	} else {
		// Just a workload kind
		kind = request.WorkloadId
	}

	// Create the downsync rule
	if kind != "" {
		// Convert kind to resource (plural)
		resource := strings.ToLower(kind)
		if !strings.HasSuffix(resource, "s") {
			resource += "s"
		}

		// Make sure apiGroup is never empty
		if apiGroup == "" {
			apiGroup = "core"
		}

		// Create the downsync rule
		downsyncRule := map[string]interface{}{
			"apiGroup":   apiGroup,
			"resources":  []string{resource},
			"namespaces": []string{namespace},
		}

		// If specific workload name is available, add it to annotations
		if workloadName != "" {
			metadata := policyObj["metadata"].(map[string]interface{})
			annotations := metadata["annotations"].(map[string]string)
			annotations["specific-workload-name"] = workloadName
		}

		// Add the downsync rule
		downsyncRules := policyObj["spec"].(map[string]interface{})["downsync"].([]interface{})
		downsyncRules = append(downsyncRules, downsyncRule)
		policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules
	}

	// Generate YAML for the policy object
	yamlData, err := yaml.Marshal(policyObj)
	if err != nil {
		fmt.Printf("Debug - YAML marshaling error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	fmt.Printf("Debug - Generated YAML:\n%s\n", rawYAML)

	// Now parse back into a BindingPolicy struct
	newBP := &v1alpha1.BindingPolicy{}
	if err := yaml.Unmarshal(yamlData, newBP); err != nil {
		fmt.Printf("Debug - Error parsing generated YAML back into BindingPolicy: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to parse generated YAML: %s", err.Error())})
		return
	}

	// Ensure the name is set
	if newBP.Name == "" {
		newBP.Name = policyName
		fmt.Printf("Debug - Name was empty, setting to: %s\n", policyName)
	}

	// Ensure each downsync rule has a non-empty apiGroup
	for i := range newBP.Spec.Downsync {
		if newBP.Spec.Downsync[i].APIGroup == nil || *newBP.Spec.Downsync[i].APIGroup == "" {
			coreGroup := "core"
			newBP.Spec.Downsync[i].APIGroup = &coreGroup
			fmt.Printf("Debug - Fixed empty APIGroup in downsync[%d] to 'core'\n", i)
		}
	}

	// Create a StoredBindingPolicy for cache
	specificWorkloads := []WorkloadInfo{}
	if workloadName != "" {
		specificWorkloads = append(specificWorkloads, WorkloadInfo{
			APIVersion: fmt.Sprintf("%s/v1", apiGroup),
			Kind:       kind,
			Name:       workloadName,
			Namespace:  namespace,
		})
	}

	// Build ClusterSelectors for storage
	clusterSelectors := []map[string]string{
		{
			"kubernetes.io/cluster-name": request.ClusterId,
		},
	}

	// Store the policy in memory
	storedBP := &StoredBindingPolicy{
		Name:              policyName,
		Namespace:         namespace,
		ClusterSelectors:  clusterSelectors,
		APIGroups:         []string{apiGroup},
		Resources:         []string{strings.ToLower(kind) + "s"},
		Namespaces:        []string{namespace},
		SpecificWorkloads: specificWorkloads,
		RawYAML:           rawYAML,
	}
	uiCreatedPolicies[policyName] = storedBP

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Create the binding policy
	_, err = c.BindingPolicies().Create(context.TODO(), newBP, v1.CreateOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ctx.JSON(http.StatusConflict, gin.H{
				"error":  fmt.Sprintf("BindingPolicy '%s' in namespace '%s' already exists", policyName, namespace),
				"status": "exists",
			})
			return
		}
		fmt.Printf("Debug - BP creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create binding policy: %s", err.Error())})
		return
	}

	// Build the response
	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Created binding policy '%s' in namespace '%s' successfully", policyName, namespace),
		"bindingPolicy": gin.H{
			"name":           policyName,
			"namespace":      namespace,
			"status":         "inactive", // New policies start as inactive
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       []string{request.ClusterId},
			"workloads":      []string{request.WorkloadId},
			"clustersCount":  1, // Always 1 cluster for quick binding policy
			"workloadsCount": 1, // Always 1 workload for quick binding policy
			"yaml":           rawYAML,
		},
	})
}

// GenerateQuickBindingPolicyYAML generates the YAML for a binding policy connecting a workload to a cluster
// without actually creating the policy
func GenerateQuickBindingPolicyYAML(ctx *gin.Context) {
	fmt.Printf("Debug - Starting GenerateQuickBindingPolicyYAML handler\n")

	// Define a struct to parse the request - same as in CreateQuickBindingPolicy
	type QuickBindingPolicyRequest struct {
		WorkloadId string `json:"workloadId"` // The ID of the workload
		ClusterId  string `json:"clusterId"`  // The ID of the cluster
		PolicyName string `json:"policyName"` // Optional custom name for the policy
		Namespace  string `json:"namespace"`  // Optional namespace
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	// Validate required fields
	if request.WorkloadId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "workloadId is required"})
		return
	}
	if request.ClusterId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "clusterId is required"})
		return
	}

	// Set default namespace if not provided
	namespace := "default"
	if request.Namespace != "" {
		namespace = request.Namespace
	}

	// Generate a policy name if not provided
	policyName := request.PolicyName
	if policyName == "" {
		// Create a name based on workload and cluster IDs
		policyName = fmt.Sprintf("%s-to-%s", request.WorkloadId, request.ClusterId)
		// Clean up the name to be valid for Kubernetes
		policyName = strings.ReplaceAll(policyName, "/", "-")
		policyName = strings.ReplaceAll(policyName, ":", "-")
		policyName = strings.ToLower(policyName)
	}

	// Create a policy as a generic map that we'll convert to YAML
	policyObj := map[string]interface{}{
		"apiVersion": "control.kubestellar.io/v1alpha1",
		"kind":       "BindingPolicy",
		"metadata": map[string]interface{}{
			"name":      policyName,
			"namespace": namespace,
			"annotations": map[string]string{
				"created-by":         "kubestellar-ui-yaml-generator",
				"workload-id":        request.WorkloadId,
				"cluster-id":         request.ClusterId,
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": map[string]string{
						"kubernetes.io/cluster-name": request.ClusterId,
					},
				},
			},
			"downsync": []interface{}{},
		},
	}

	// Parse workload ID to extract information
	// Format could be: Deployment/nginx or apps:v1:Deployment/nginx
	var apiGroup string = "core"
	var kind string
	var workloadName string

	if strings.Contains(request.WorkloadId, ":") {
		// Format: apps:v1:Deployment/nginx
		parts := strings.Split(request.WorkloadId, ":")
		if len(parts) >= 3 {
			apiGroup = parts[0]
			kind = parts[2]
			if strings.Contains(kind, "/") {
				kindParts := strings.Split(kind, "/")
				kind = kindParts[0]
				if len(kindParts) > 1 {
					workloadName = kindParts[1]
				}
			}
		}
	} else if strings.Contains(request.WorkloadId, "/") {
		// Format: Deployment/nginx
		parts := strings.Split(request.WorkloadId, "/")
		kind = parts[0]
		if len(parts) > 1 {
			workloadName = parts[1]
		}

		// Set default API group based on kind
		if strings.ToLower(kind) == "deployment" ||
			strings.ToLower(kind) == "statefulset" ||
			strings.ToLower(kind) == "daemonset" ||
			strings.ToLower(kind) == "replicaset" {
			apiGroup = "apps"
		} else if strings.ToLower(kind) == "job" || strings.ToLower(kind) == "cronjob" {
			apiGroup = "batch"
		}
	} else {
		// Just a workload kind
		kind = request.WorkloadId
	}

	// Create the downsync rule
	if kind != "" {
		// Convert kind to resource (plural)
		resource := strings.ToLower(kind)
		if !strings.HasSuffix(resource, "s") {
			resource += "s"
		}

		// Make sure apiGroup is never empty
		if apiGroup == "" {
			apiGroup = "core"
		}

		// Create the downsync rule
		downsyncRule := map[string]interface{}{
			"apiGroup":   apiGroup,
			"resources":  []string{resource},
			"namespaces": []string{namespace},
		}

		// If specific workload name is available, add it to annotations
		if workloadName != "" {
			metadata := policyObj["metadata"].(map[string]interface{})
			annotations := metadata["annotations"].(map[string]string)
			annotations["specific-workload-name"] = workloadName
		}

		// Add the downsync rule
		downsyncRules := policyObj["spec"].(map[string]interface{})["downsync"].([]interface{})
		downsyncRules = append(downsyncRules, downsyncRule)
		policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules
	}

	// Generate YAML for the policy object
	yamlData, err := yaml.Marshal(policyObj)
	if err != nil {
		fmt.Printf("Debug - YAML marshaling error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	fmt.Printf("Debug - Generated YAML:\n%s\n", rawYAML)

	// Return the YAML and policy info
	ctx.JSON(http.StatusOK, gin.H{
		"yaml": rawYAML,
		"bindingPolicy": gin.H{
			"name":           policyName,
			"namespace":      namespace,
			"clusterId":      request.ClusterId,
			"workloadId":     request.WorkloadId,
			"apiGroup":       apiGroup,
			"resourceKind":   kind,
			"status":         "inactive", // Would be inactive if created
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       []string{request.ClusterId},
			"workloads":      []string{request.WorkloadId},
			"clustersCount":  1, // Always 1 cluster for quick binding policy
			"workloadsCount": 1, // Always 1 workload for quick binding policy
		},
	})
}
