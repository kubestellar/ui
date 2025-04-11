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
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/utils"
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

		// Store the YAML content in annotations if not already present
		if bpWithStatus.Annotations == nil {
			bpWithStatus.Annotations = make(map[string]string)
		}
		if _, exists := bpWithStatus.Annotations["yaml"]; !exists {
			// Check if this is a quick connect policy by looking for the annotation
			if storedBP, exists := uiCreatedPolicies[bpWithStatus.Name]; exists && storedBP.RawYAML != "" {
				// Use the original YAML for quick connect policies
				bpWithStatus.Annotations["yaml"] = storedBP.RawYAML
			} else {
				// Create a minimal version of the binding policy for YAML
				cleanBP := map[string]interface{}{
					"apiVersion": "control.kubestellar.io/v1alpha1",
					"kind":       "BindingPolicy",
					"metadata": map[string]interface{}{
						"name": bpWithStatus.Name,
					},
					"spec": map[string]interface{}{},
				}

				// Add namespace if not empty
				if bpWithStatus.Namespace != "" {
					cleanBP["metadata"].(map[string]interface{})["namespace"] = bpWithStatus.Namespace
				}

				// Add only essential annotations
				if len(bpWithStatus.Annotations) > 0 {
					relevantAnnotations := map[string]string{}
					for k, v := range bpWithStatus.Annotations {
						if k == "created-by" || k == "creation-timestamp" ||
							(!strings.HasPrefix(k, "kubectl.kubernetes.io/") &&
								!strings.HasPrefix(k, "kubernetes.io/") &&
								k != "yaml" &&
								!strings.Contains(k, "managedFields")) {
							relevantAnnotations[k] = v
						}
					}
					if len(relevantAnnotations) > 0 {
						cleanBP["metadata"].(map[string]interface{})["annotations"] = relevantAnnotations
					}
				}

				// Add non-empty labels only
				if len(bpWithStatus.Labels) > 0 {
					relevantLabels := map[string]string{}
					for k, v := range bpWithStatus.Labels {
						if v != "" {
							relevantLabels[k] = v
						}
					}
					if len(relevantLabels) > 0 {
						cleanBP["metadata"].(map[string]interface{})["labels"] = relevantLabels
					}
				}

				// Add cluster selectors (properly formatted)
				if len(bpWithStatus.Spec.ClusterSelectors) > 0 {
					cleanSelectors := []map[string]interface{}{}
					for _, selector := range bpWithStatus.Spec.ClusterSelectors {
						if len(selector.MatchLabels) > 0 {
							cleanSelector := map[string]interface{}{
								"matchLabels": selector.MatchLabels,
							}
							cleanSelectors = append(cleanSelectors, cleanSelector)
						}
					}
					if len(cleanSelectors) > 0 {
						specMap := cleanBP["spec"].(map[string]interface{})
						specMap["clusterSelectors"] = cleanSelectors
					}
				}

				// Add downsync rules (properly formatted)
				if len(bpWithStatus.Spec.Downsync) > 0 {
					cleanDownsync := []map[string]interface{}{}
					for _, ds := range bpWithStatus.Spec.Downsync {
						cleanDs := map[string]interface{}{}

						// Add resources
						if len(ds.Resources) > 0 {
							cleanDs["resources"] = ds.Resources
						}

						// Add API group only if not empty
						if ds.APIGroup != nil && *ds.APIGroup != "" {
							cleanDs["apiGroup"] = *ds.APIGroup
						}

						// Add namespaces only if not empty
						if len(ds.Namespaces) > 0 {
							cleanDs["namespaces"] = ds.Namespaces
						}

						// Add object selectors only if they have matchLabels
						if len(ds.ObjectSelectors) > 0 {
							cleanObjSelectors := []map[string]interface{}{}
							for _, objSelector := range ds.ObjectSelectors {
								if len(objSelector.MatchLabels) > 0 {
									cleanObjSelectors = append(cleanObjSelectors, map[string]interface{}{
										"matchLabels": objSelector.MatchLabels,
									})
								}
							}
							if len(cleanObjSelectors) > 0 {
								cleanDs["objectSelectors"] = cleanObjSelectors
							}
						}

						// Add createOnly flag only if true
						if ds.CreateOnly {
							cleanDs["createOnly"] = true
						}

						if len(cleanDs) > 0 {
							cleanDownsync = append(cleanDownsync, cleanDs)
						}
					}

					if len(cleanDownsync) > 0 {
						specMap := cleanBP["spec"].(map[string]interface{})
						specMap["downsync"] = cleanDownsync
					}
				}

				// Convert to YAML
				yamlBytes, err := yaml.Marshal(cleanBP)
				if err == nil {
					bpWithStatus.Annotations["yaml"] = string(yamlBytes)
				}
			}
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
		}

		// Check if this is a quick connect policy and use its original YAML
		if storedBP, exists := uiCreatedPolicies[bp.Name]; exists && storedBP.RawYAML != "" {
			policyMap["yaml"] = storedBP.RawYAML
		} else {
			policyMap["yaml"] = bp.Annotations["yaml"]
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
		return
	}

	// Extract the base content type
	baseContentType := contentType
	if idx := strings.Index(contentType, ";"); idx != -1 {
		baseContentType = strings.TrimSpace(contentType[:idx])
	}

	if baseContentType == "application/yaml" {
		bpRawYamlBytes, err = io.ReadAll(ctx.Request.Body)
		if err != nil {
			log.LogError("error reading yaml input", zap.String("error", err.Error()))
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	if baseContentType == "multipart/form-data" {
		var err error
		bpRawYamlBytes, err = utils.GetFormFileBytes("bpYaml", ctx)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			log.LogError(err.Error())
			return
		}
		log.LogInfo("received bp yaml file")
		log.LogInfo(string(bpRawYamlBytes))
	}

	// Add debug for byte length
	fmt.Printf("Debug - YAML byte length: %d\n", len(bpRawYamlBytes))
	fmt.Printf("Debug - YAML content: %s\n", string(bpRawYamlBytes))

	// Try using the more robust Kubernetes deserializer
	bp, err := getBpObjFromYaml(bpRawYamlBytes)
	if err != nil {
		log.LogError(err.Error())
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return

	}
	c, err := getClientForBp()
	if err != nil {
		log.LogInfo(err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	_, err = c.BindingPolicies().Create(context.TODO(), bp, v1.CreateOptions{})
	if err != nil {
		log.LogError(err.Error())
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}

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
	if bp.ObjectMeta.Generation == bp.Status.ObservedGeneration {
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

// CreateQuickBindingPolicy creates a simple binding policy connecting workload(s) to cluster(s)
func CreateQuickBindingPolicy(ctx *gin.Context) {
	fmt.Printf("Debug - Starting CreateQuickBindingPolicy handler\n")

	// Define a struct to parse the quick connection request
	type ResourceConfig struct {
		Type       string `json:"type"`       // Resource type (e.g., "deployments", "namespaces")
		CreateOnly bool   `json:"createOnly"` // Whether to use createOnly mode for this resource
	}

	type QuickBindingPolicyRequest struct {
		WorkloadLabels   map[string]string `json:"workloadLabels"`   // Labels to select workloads
		ClusterLabels    map[string]string `json:"clusterLabels"`    // Labels to select clusters
		Resources        []ResourceConfig  `json:"resources"`        // Resources with their configurations
		NamespacesToSync []string          `json:"namespacesToSync"` // Namespaces to sync resources from
		PolicyName       string            `json:"policyName"`       // Optional custom name for the policy
		Namespace        string            `json:"namespace"`        // Optional namespace
		// For backward compatibility
		ResourceTypes []string `json:"resourceTypes"` // Legacy: Resource types to sync
		CreateOnly    bool     `json:"createOnly"`    // Legacy: Whether to use createOnly mode for all resources
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		fmt.Printf("Debug - JSON binding error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	fmt.Printf("Debug - Received request: %+v\n", request)

	// Validate required fields
	if len(request.WorkloadLabels) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "workloadLabels are required"})
		return
	}

	if len(request.ClusterLabels) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "clusterLabels are required"})
		return
	}

	// Handle both new and legacy resource specifications
	resourceConfigs := request.Resources
	if len(resourceConfigs) == 0 && len(request.ResourceTypes) > 0 {
		// Convert legacy format to new format
		for _, resType := range request.ResourceTypes {
			// Skip pods in legacy format
			if strings.ToLower(resType) == "pods" {
				continue
			}
			resourceConfigs = append(resourceConfigs, ResourceConfig{
				Type:       resType,
				CreateOnly: request.CreateOnly,
			})
		}
	}

	// Filter out pods from resources instead of rejecting entire request
	filteredResources := []ResourceConfig{}
	podsDetected := false

	for _, resourceCfg := range resourceConfigs {
		if strings.ToLower(resourceCfg.Type) == "pods" {
			podsDetected = true
			continue
		}
		filteredResources = append(filteredResources, resourceCfg)
	}

	resourceConfigs = filteredResources

	if len(resourceConfigs) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one valid resource type is required (pods are not allowed)"})
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
		// Create a name based on the first workload label and first cluster label
		firstWorkloadKey, firstWorkloadValue := getFirstMapEntry(request.WorkloadLabels)
		firstClusterKey, firstClusterValue := getFirstMapEntry(request.ClusterLabels)

		policyName = fmt.Sprintf("%s-%s-to-%s-%s", firstWorkloadKey, firstWorkloadValue,
			firstClusterKey, firstClusterValue)

		// Clean up the name to be valid for Kubernetes
		policyName = strings.ReplaceAll(policyName, "/", "-")
		policyName = strings.ReplaceAll(policyName, ":", "-")
		policyName = strings.ReplaceAll(policyName, ".", "-")
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
				"created-by":         "kubestellar-ui-quick-create",
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": request.ClusterLabels,
				},
			},
			"downsync": []interface{}{},
		},
	}

	// Determine namespaces to sync
	namespacesToSync := request.NamespacesToSync
	if len(namespacesToSync) == 0 {
		namespacesToSync = []string{namespace}
	}

	// Always add a namespaces sync rule first (without createOnly)
	namespaceRule := map[string]interface{}{
		"resources": []string{"namespaces"},
		"objectSelectors": []interface{}{
			map[string]interface{}{
				"matchLabels": request.WorkloadLabels,
			},
		},
	}

	downsyncRules := []interface{}{namespaceRule}

	// Now add other resources
	for _, resourceCfg := range resourceConfigs {
		resource := resourceCfg.Type

		// Skip if this is namespaces - we've already added it
		if resource == "namespaces" {
			continue
		}

		// Create a separate downsync rule for this resource
		downsyncRule := map[string]interface{}{
			"resources": []string{resource},
			"objectSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": request.WorkloadLabels,
				},
			},
		}

		// Only add createOnly if it's true
		if resourceCfg.CreateOnly {
			downsyncRule["createOnly"] = true
		}

		// Add namespaces to the rule
		if len(namespacesToSync) > 0 {
			downsyncRule["namespaces"] = namespacesToSync
		}

		// Add this downsync rule
		downsyncRules = append(downsyncRules, downsyncRule)
	}

	// Set the downsync rules in the policy
	policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules

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
	newBP, err := getBpObjFromYaml(yamlData)
	if err != nil {
		fmt.Printf("Debug - Error parsing generated YAML back into BindingPolicy: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to parse generated YAML: %s", err.Error())})
		return
	}

	// Store the policy in memory for future reference
	storedBP := &StoredBindingPolicy{
		Name:      policyName,
		Namespace: namespace,
		RawYAML:   rawYAML,
	}
	uiCreatedPolicies[policyName] = storedBP

	// Get client and create the binding policy
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

	// Format the response
	clusterLabelsFormatted := []string{}
	for k, v := range request.ClusterLabels {
		clusterLabelsFormatted = append(clusterLabelsFormatted, fmt.Sprintf("%s: %s", k, v))
	}

	workloadLabelsFormatted := []string{}
	for k, v := range request.WorkloadLabels {
		workloadLabelsFormatted = append(workloadLabelsFormatted, fmt.Sprintf("%s: %s", k, v))
	}

	resourcesFormatted := []string{}
	resourcesFormatted = append(resourcesFormatted, "namespaces")
	for _, res := range resourceConfigs {
		if res.Type != "namespaces" {
			resourceDesc := res.Type
			if res.CreateOnly {
				resourceDesc += " (createOnly)"
			}
			resourcesFormatted = append(resourcesFormatted, resourceDesc)
		}
	}

	response := gin.H{
		"message": fmt.Sprintf("Created binding policy '%s' in namespace '%s' successfully", policyName, namespace),
		"bindingPolicy": gin.H{
			"name":           policyName,
			"namespace":      namespace,
			"status":         "inactive", // New policies start as inactive
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       clusterLabelsFormatted,
			"workloads":      append(resourcesFormatted, workloadLabelsFormatted...),
			"clustersCount":  len(clusterLabelsFormatted),
			"workloadsCount": len(resourcesFormatted) + len(workloadLabelsFormatted),
			"yaml":           rawYAML,
		},
	}

	// Add warning if pods were filtered out
	if podsDetected {
		response["warning"] = "Pods were excluded from the binding policy as they should be managed through higher-level controllers"
	}

	ctx.JSON(http.StatusOK, response)
}

// Helper function to get the first key-value pair from a map
func getFirstMapEntry(m map[string]string) (string, string) {
	for k, v := range m {
		return k, v
	}
	return "", ""
}

// GenerateQuickBindingPolicyYAML generates the YAML for a binding policy connecting workload(s) to cluster(s)
// without actually creating the policy
func GenerateQuickBindingPolicyYAML(ctx *gin.Context) {
	fmt.Printf("Debug - Starting GenerateQuickBindingPolicyYAML handler\n")

	// Define a struct to parse the request - same as CreateQuickBindingPolicy
	type ResourceConfig struct {
		Type       string `json:"type"`       // Resource type (e.g., "deployments", "namespaces")
		CreateOnly bool   `json:"createOnly"` // Whether to use createOnly mode for this resource
	}

	type QuickBindingPolicyRequest struct {
		WorkloadLabels   map[string]string `json:"workloadLabels"`   // Labels to select workloads
		ClusterLabels    map[string]string `json:"clusterLabels"`    // Labels to select clusters
		Resources        []ResourceConfig  `json:"resources"`        // Resources with their configurations
		NamespacesToSync []string          `json:"namespacesToSync"` // Namespaces to sync resources from
		PolicyName       string            `json:"policyName"`       // Optional custom name for the policy
		Namespace        string            `json:"namespace"`        // Optional namespace
		// For backward compatibility
		ResourceTypes []string `json:"resourceTypes"` // Legacy: Resource types to sync
		CreateOnly    bool     `json:"createOnly"`    // Legacy: Whether to use createOnly mode for all resources
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		fmt.Printf("Debug - JSON binding error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	fmt.Printf("Debug - Received request: %+v\n", request)

	// Validate required fields
	if len(request.WorkloadLabels) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "workloadLabels are required"})
		return
	}

	if len(request.ClusterLabels) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "clusterLabels are required"})
		return
	}

	// Handle both new and legacy resource specifications
	resourceConfigs := request.Resources
	if len(resourceConfigs) == 0 && len(request.ResourceTypes) > 0 {
		// Convert legacy format to new format
		for _, resType := range request.ResourceTypes {
			// Skip pods in legacy format
			if strings.ToLower(resType) == "pods" {
				continue
			}
			resourceConfigs = append(resourceConfigs, ResourceConfig{
				Type:       resType,
				CreateOnly: request.CreateOnly,
			})
		}
	}

	// Filter out pods from resources instead of rejecting entire request
	filteredResources := []ResourceConfig{}
	podsDetected := false

	for _, resourceCfg := range resourceConfigs {
		if strings.ToLower(resourceCfg.Type) == "pods" {
			podsDetected = true
			continue
		}
		filteredResources = append(filteredResources, resourceCfg)
	}

	resourceConfigs = filteredResources

	if len(resourceConfigs) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one valid resource type is required (pods are not allowed)"})
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
		// Create a name based on the first workload label and first cluster label
		firstWorkloadKey, firstWorkloadValue := getFirstMapEntry(request.WorkloadLabels)
		firstClusterKey, firstClusterValue := getFirstMapEntry(request.ClusterLabels)

		policyName = fmt.Sprintf("%s-%s-to-%s-%s", firstWorkloadKey, firstWorkloadValue,
			firstClusterKey, firstClusterValue)

		// Clean up the name to be valid for Kubernetes
		policyName = strings.ReplaceAll(policyName, "/", "-")
		policyName = strings.ReplaceAll(policyName, ":", "-")
		policyName = strings.ReplaceAll(policyName, ".", "-")
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
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": request.ClusterLabels,
				},
			},
			"downsync": []interface{}{},
		},
	}

	// Determine namespaces to sync
	namespacesToSync := request.NamespacesToSync
	if len(namespacesToSync) == 0 {
		namespacesToSync = []string{namespace}
	}

	// Always add a namespaces sync rule first (without createOnly)
	namespaceRule := map[string]interface{}{
		"resources": []string{"namespaces"},
		"objectSelectors": []interface{}{
			map[string]interface{}{
				"matchLabels": request.WorkloadLabels,
			},
		},
	}

	downsyncRules := []interface{}{namespaceRule}

	// Now add other resources
	for _, resourceCfg := range resourceConfigs {
		resource := resourceCfg.Type

		// Skip if this is namespaces - we've already added it
		if resource == "namespaces" {
			continue
		}

		// Create a separate downsync rule for this resource
		downsyncRule := map[string]interface{}{
			"resources": []string{resource},
			"objectSelectors": []interface{}{
				map[string]interface{}{
					"matchLabels": request.WorkloadLabels,
				},
			},
		}

		// Only add createOnly if it's true
		if resourceCfg.CreateOnly {
			downsyncRule["createOnly"] = true
		}

		// Add namespaces to the rule
		if len(namespacesToSync) > 0 {
			downsyncRule["namespaces"] = namespacesToSync
		}

		// Add this downsync rule
		downsyncRules = append(downsyncRules, downsyncRule)
	}

	// Set the downsync rules in the policy
	policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules

	// Generate YAML for the policy object
	yamlData, err := yaml.Marshal(policyObj)
	if err != nil {
		fmt.Printf("Debug - YAML marshaling error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	fmt.Printf("Debug - Generated YAML:\n%s\n", rawYAML)

	// Format the response
	clusterLabelsFormatted := []string{}
	for k, v := range request.ClusterLabels {
		clusterLabelsFormatted = append(clusterLabelsFormatted, fmt.Sprintf("%s: %s", k, v))
	}

	workloadLabelsFormatted := []string{}
	for k, v := range request.WorkloadLabels {
		workloadLabelsFormatted = append(workloadLabelsFormatted, fmt.Sprintf("%s: %s", k, v))
	}

	resourcesFormatted := []string{}
	resourcesFormatted = append(resourcesFormatted, "namespaces")
	for _, res := range resourceConfigs {
		if res.Type != "namespaces" {
			resourceDesc := res.Type
			if res.CreateOnly {
				resourceDesc += " (createOnly)"
			}
			resourcesFormatted = append(resourcesFormatted, resourceDesc)
		}
	}

	// Return the YAML and policy info without creating it
	response := gin.H{
		"yaml": rawYAML,
		"bindingPolicy": gin.H{
			"name":           policyName,
			"namespace":      namespace,
			"status":         "inactive", // Would be inactive if created
			"bindingMode":    "Downsync", // Only Downsync is supported
			"clusters":       clusterLabelsFormatted,
			"workloads":      append(resourcesFormatted, workloadLabelsFormatted...),
			"clustersCount":  len(clusterLabelsFormatted),
			"workloadsCount": len(resourcesFormatted) + len(workloadLabelsFormatted),
		},
	}

	// Add warning if pods were filtered out
	if podsDetected {
		response["warning"] = "Pods were excluded from the binding policy as they should be managed through higher-level controllers"
	}

	ctx.JSON(http.StatusOK, response)
}

// Helper function to get map keys
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
