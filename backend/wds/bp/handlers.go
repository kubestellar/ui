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
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Optional namespace filter
	namespace := ctx.Query("namespace")
	listOptions := v1.ListOptions{}

	// Get all binding policies
	bpList, err := c.BindingPolicies().List(context.TODO(), listOptions)
	if err != nil {
		log.LogError("failed to list binding policies", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

		status := "inactive"
		if bpList.Items[i].ObjectMeta.Generation == bpList.Items[i].Status.ObservedGeneration {
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
			log.LogDebug("GetAllBp - Found stored BP in memory with key", zap.String("key", policyName))
			// Use the stored cluster selectors for more detailed information
			if len(storedBP.ClusterSelectors) > 0 {
				for _, selector := range storedBP.ClusterSelectors {
					if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
						// Check if already in the clusters array
						if !contains(clusters, clusterName) {
							clusters = append(clusters, clusterName)
							log.LogDebug("GetAllBp - Added cluster from stored data", zap.String("ClusterLabels", clusterName))
						}
					}
				}
			}

			// If we still have no clusters but have YAML data, try to parse it
			if len(clusters) == 0 && storedBP.RawYAML != "" {
				log.LogDebug("GetAllBp - Trying to parse stored raw YAML for clusters")
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
													log.LogDebug("GetAllBp - Added cluster from YAML", zap.String("cluster", vStr))
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
			log.LogDebug("GetAllBp - Using stored policy data for workloads")
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
								log.LogDebug("GetAllBp - Added workload from stored data", zap.String("workloadItem", workloadItem))
							}
						}
					} else if !contains(workloads, workloadType) {
						workloads = append(workloads, workloadType)
						log.LogDebug("GetAllBp - Added workload from stored data", zap.String("workloadType", workloadType))
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
					log.LogDebug("GetAllBp - Added specific workload from stored data", zap.String("workloadDesc", workloadDesc))
				}
			}
		} else {
			// If no stored data, extract from BP directly
			log.LogDebug("GetAllBp - Extracting workloads from API response for", zap.String("policyName", policyName))

			// Extract from the policy's downsync field
			for i, ds := range bpList.Items[i].Spec.Downsync {
				apiGroupValue := "core" // Default to core
				if ds.APIGroup != nil && *ds.APIGroup != "" {
					apiGroupValue = *ds.APIGroup
				}

				log.LogDebug("GetAllBp - extract from the policy's downsync", zap.Int("index", i),
					zap.String("apiGroup", apiGroupValue), zap.Any("resources", ds.Resources), zap.Any("namespace", ds.Namespaces))

				for _, resource := range ds.Resources {
					// Convert resource to lowercase for consistent handling
					resourceLower := strings.ToLower(resource)
					workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resourceLower)

					if len(ds.Namespaces) > 0 {
						for _, ns := range ds.Namespaces {
							workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, ns)
							if !contains(workloads, workloadItem) {
								workloads = append(workloads, workloadItem)
								log.LogDebug("GetAllBp - Added workload from API", zap.String("workloadItem", workloadItem))
							}
						}
					} else if !contains(workloads, workloadType) {
						workloads = append(workloads, workloadType)
						log.LogDebug("GetAllBp - Added workload from API", zap.String("workloadType", workloadType))
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
						log.LogDebug("GetAllBp - Added specific workload from annotations", zap.String("workloadDesc", workloadDesc))
					}
				}

				// Check for workload-id annotation (used in quick binding policies)
				if workloadId, ok := annotations["workload-id"]; ok && workloadId != "" && !contains(workloads, workloadId) {
					workloads = append(workloads, workloadId)
					log.LogDebug("GetAllBp - Added workload from workload-id annotation", zap.String("workloadId", workloadId))
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
			log.LogDebug("GetAllBp - No workloads found, adding default")
		}

		// Ensure we have cluster count consistent with the array
		clustersCount := len(clusters)

		// Set explicit cluster count for clarity in logs
		log.LogInfo("GetAllBp - Found clusters and workloads for policy",
			zap.String("policy", policyName),
			zap.Int("clustersCount", clustersCount),
			zap.Int("workloadsCount", len(workloads)),
		)

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
	log.LogDebug("YAML byte length", zap.Int("length", len(bpRawYamlBytes)))
	log.LogDebug("YAML content", zap.String("content", string(bpRawYamlBytes)))

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

	log.LogDebug("GetBpStatus - Received request",
		zap.String("name", name), zap.String("namespace", namespace))

	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name parameter is required"})
		return
	}

	if namespace == "" {
		namespace = "default" // Set default namespace
	}

	log.LogDebug("GetBpStatus - Using namespace", zap.String("namespace", namespace))

	c, err := getClientForBp()
	if err != nil {
		log.LogError("GetBpStatus - Client error", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Try to get binding policy directly
	bp, err := c.BindingPolicies().Get(context.TODO(), name, v1.GetOptions{})
	if err != nil {
		log.LogDebug("GetBpStatus - Direct Get error", zap.Error(err))

		// Try to list all binding policies to see if it exists
		bpList, listErr := c.BindingPolicies().List(context.TODO(), v1.ListOptions{})
		if listErr != nil {
			log.LogError("GetBpStatus - List error", zap.Error(listErr))
			ctx.JSON(http.StatusNotFound, gin.H{
				"error": fmt.Sprintf("Binding policy '%s' not found and failed to list policies: %v", name, listErr),
			})
			return
		}

		// Check if we can find the policy with the given name
		var foundBP *v1alpha1.BindingPolicy
		log.LogInfo("GetBpStatus - Listing all BPs to find", zap.String("name", name))
		for i, item := range bpList.Items {
			log.LogDebug("inspecting binding policy", zap.Int("index", i), zap.String("namespace", namespace), zap.String("name", name))
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
		log.LogDebug("GetBpStatus - Found BP with matching name in namespace", zap.String("namespace", bp.Namespace))
	}

	// Look for this binding policy in the uiCreatedPolicies map
	storedBP, exists := uiCreatedPolicies[name]
	if exists {
		log.LogDebug("GetBpStatus - Found stored BP in memory with key", zap.String("name", name))
		// Debug the stored policy
		log.LogDebug(" Stored BP ClusterSelectors", zap.Any("clustersSelectors", storedBP.ClusterSelectors))
	} else {
		log.LogDebug("GetBpStatus - No stored BP found in memory with key", zap.String("name", name))
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
		log.LogDebug("GetBpStatus - Using cluster selectors from stored policy")
		for i, selector := range storedBP.ClusterSelectors {
			if clusterName, ok := selector["kubernetes.io/cluster-name"]; ok {
				log.LogDebug("GetBpStatus - Found cluster from stored data", zap.String("clusterName", clusterName))
				clusters = append(clusters, clusterName)
			} else {
				log.LogDebug("GetBpStatus - Selector missing cluster-name", zap.Int("index", i), zap.Any("selector", selector))
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
			log.LogDebug("GetAllBp - Adding specific workload from storage", zap.String("workloadDesc", workloadDesc))
			workloads = append(workloads, workloadDesc)
		}
	} else {
		// Try to extract from the API response
		log.LogInfo("GetAllBp - Trying to extract from API response")

		// Extract clusters from BP
		for i, selector := range bp.Spec.ClusterSelectors {
			if selector.MatchLabels == nil {
				continue
			}

			log.LogDebug("GetAllBp - Processing cluster selector",
				zap.Int("index", i), zap.Any("matchLabels", selector.MatchLabels))

			// Check for kubernetes.io/cluster-name label
			if clusterName, ok := selector.MatchLabels["kubernetes.io/cluster-name"]; ok {
				log.LogDebug("GetAllBp - Found cluster from API", zap.String("clusterName", clusterName))
				clusters = append(clusters, clusterName)
			}
		}

		// Extract workloads from BP
		for i, ds := range bp.Spec.Downsync {
			apiGroupValue := "core" // Default to core
			if ds.APIGroup != nil && *ds.APIGroup != "" {
				apiGroupValue = *ds.APIGroup
			}

			log.LogDebug("GetAllBp - Processing Downsync entry",
				zap.Int("index", i), zap.String("apiGroup", apiGroupValue),
				zap.Any("resources", ds.Resources), zap.Any("namespaces", ds.Namespaces))

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
		log.LogDebug("GetAllBp - Trying to parse stored raw YAML")
		// Parse the raw YAML to extract information
		var yamlMap map[string]interface{}
		if err := yaml.Unmarshal([]byte(storedBP.RawYAML), &yamlMap); err != nil {
			log.LogDebug("GetAllBp - Failed to parse raw YAML", zap.Error(err))

		} else {
			// Try to extract cluster selectors from YAML
			if spec, ok := yamlMap["spec"].(map[interface{}]interface{}); ok {
				if selectors, ok := spec["clusterSelectors"].([]interface{}); ok {
					log.LogDebug("GetAllBp - Found cluster selectors in YAML", zap.Int("count", len(selectors)))
					for _, selectorObj := range selectors {
						if selector, ok := selectorObj.(map[interface{}]interface{}); ok {
							if matchLabels, ok := selector["matchLabels"].(map[interface{}]interface{}); ok {
								for k, v := range matchLabels {
									if kStr, ok := k.(string); ok && kStr == "kubernetes.io/cluster-name" {
										if vStr, ok := v.(string); ok {
											log.LogDebug("GetAllBp - Found cluster from YAML", zap.String("cluster", vStr))
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
					log.LogDebug("GetAllBp - Found downsync entries in YAML", zap.Int("count", len(downsyncList)))
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
					log.LogDebug("GetAllBp - Found specific workloads in YAML", zap.Int("count", len(workloadsList)))
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

								log.LogDebug("GetAllBp - Found specific workload in YAML", zap.Int("index", i), zap.String("workload", workloadDesc))

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
	log.LogDebug("GetAllBp - Returning response",
		zap.String("name", bp.Name),
		zap.String("namespace", bp.Namespace),
		zap.Int("clusters_count", len(clusters)),
		zap.Any("clusters", clusters),
		zap.Int("workloads_count", len(workloads)),
		zap.Any("workloads", workloads))

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
	log.LogInfo("Starting CreateBpFromJson handler")
	log.LogDebug("KUBECONFIG", zap.String("KUBECONFIG", os.Getenv("KUBECONFIG")))
	log.LogDebug("wds_context", zap.String("wds_context", os.Getenv("wds_context")))

	// Check Content-Type header
	contentType := ctx.GetHeader("Content-Type")
	log.LogDebug("Content-Type", zap.String("contentType", contentType))
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
		log.LogError("JSON binding error", zap.Error(err))
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

	log.LogDebug("Received policy request", zap.Any("bpRequest", bpRequest))

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
		log.LogError("YAML marshaling error", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	log.LogDebug("Generated YAML", zap.String("yaml", rawYAML))

	// Now parse back into a BindingPolicy struct
	newBP := &v1alpha1.BindingPolicy{}
	if err := yaml.Unmarshal(yamlData, newBP); err != nil {
		log.LogError("Error parsing generated YAML back into BindingPolicy", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to parse generated YAML: %s", err.Error())})
		return
	}

	// Ensure the name is set
	if newBP.Name == "" {
		newBP.Name = bpRequest.Name
		log.LogDebug("Name was empty, setting to", zap.String("name", bpRequest.Name))
	}

	// Ensure each downsync rule has a non-empty apiGroup
	for i := range newBP.Spec.Downsync {
		if newBP.Spec.Downsync[i].APIGroup == nil || *newBP.Spec.Downsync[i].APIGroup == "" {
			coreGroup := "core"
			newBP.Spec.Downsync[i].APIGroup = &coreGroup
			log.LogDebug("Fixed empty APIGroup in downsync", zap.Int("index", i), zap.String("apiGroup", "core"))
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
	log.LogInfo("Stored policy in memory cache", zap.String("key", newBP.Name))

	// Get client
	c, err := getClientForBp()
	if err != nil {
		log.LogError("Client creation error", zap.Error(err))
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
		log.LogError("BP creation error", zap.Error(err))
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
	log.LogInfo("Starting CreateQuickBindingPolicy handler")

	// Define a struct to parse the quick connection request
	type ResourceConfig struct {
		Type       string `json:"type"`       // Resource type (e.g., "deployments", "namespaces")
		CreateOnly bool   `json:"createOnly"` // Whether to use createOnly mode for this resource
		APIGroup   string `json:"apiGroup"`   // Optional API group for the resource (for CRDs)
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
		log.LogError("JSON binding error", zap.Error(err))
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	log.LogDebug("Received request", zap.Any("request", request))

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

	// Track if we have CRDs to add
	hasCRDs := false
	crdAPIGroups := make(map[string]string)

	// First check for custom resources that will need CRDs
	for _, resourceCfg := range resourceConfigs {
		resource := resourceCfg.Type

		if isKubernetesBuiltInResource(resource) {
			continue
		}

		// Found a custom resource, track its API group for CRD handling
		apiGroup := ""
		// Check if original request has apiGroup in the matching resource
		for _, origRes := range request.Resources {
			if origRes.Type == resource && origRes.APIGroup != "" {
				apiGroup = origRes.APIGroup
				break
			}
		}

		// If no explicit apiGroup provided, use a heuristic to determine it
		if apiGroup == "" {
			singular := strings.TrimSuffix(resource, "s")

			if strings.HasSuffix(resource, "cds") || strings.HasSuffix(resource, "eds") {
				rootName := singular[:len(singular)-1]
				apiGroup = fmt.Sprintf("%s.io", rootName)
			} else {
				apiGroup = fmt.Sprintf("%s.k8s.io", singular)
			}
		}

		crdAPIGroups[resource] = apiGroup
		hasCRDs = true
	}

	// If we have custom resources, add rule(s) for CustomResourceDefinitions
	if hasCRDs {
		log.LogInfo("Adding CustomResourceDefinitions to binding policy")

		// Check if customresourcedefinitions is already in the resources list
		hasExplicitCRDResource := false
		for _, res := range resourceConfigs {
			if res.Type == "customresourcedefinitions" {
				hasExplicitCRDResource = true
				break
			}
		}

		if hasExplicitCRDResource {
			log.LogInfo("User explicitly specified CustomResourceDefinitions resource, using workload labels")
			crdRule := map[string]interface{}{
				"apiGroup":  "apiextensions.k8s.io",
				"resources": []string{"customresourcedefinitions"},
				"objectSelectors": []interface{}{
					map[string]interface{}{
						"matchLabels": request.WorkloadLabels,
					},
				},
			}
			downsyncRules = append([]interface{}{crdRule}, downsyncRules...)
		} else {
			specificCRDNames := getCRDNamesFromResources(crdAPIGroups)

			if len(specificCRDNames) > 0 {
				log.LogDebug("Adding specific CRDs to binding policy", zap.Any("specificCRDNames", specificCRDNames))

				for _, crdName := range specificCRDNames {
					log.LogDebug("Adding individual CRD rule", zap.String("crdName", crdName))

					// Individual CRD rule with explicit name matching
					crdRule := map[string]interface{}{
						"apiGroup":  "apiextensions.k8s.io",
						"resources": []string{"customresourcedefinitions"},
						"objectSelectors": []interface{}{
							map[string]interface{}{
								"matchNames": []string{crdName},
							},
						},
					}

					// Add individual CRD rule (at the beginning, so CRDs are created first)
					downsyncRules = append([]interface{}{crdRule}, downsyncRules...)
				}
			}
		}
	}

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

		// Handle custom resources by detecting non-standard resource types
		if !isKubernetesBuiltInResource(resource) {
			// For CRDs, we need to specify the apiGroup
			apiGroup := crdAPIGroups[resource]
			downsyncRule["apiGroup"] = apiGroup
			log.LogDebug("Adding CRD resource with apiGroup", zap.String("resource", resource), zap.String("apiGroup", apiGroup))
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
		log.LogError("YAML marshaling error", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	log.LogDebug("Generated YAML", zap.String("yaml", rawYAML))

	// Now parse back into a BindingPolicy struct
	newBP, err := getBpObjFromYaml(yamlData)
	if err != nil {
		log.LogError("Error parsing generated YAML back into BindingPolicy", zap.Error(err))
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
		log.LogError("Client creation error", zap.Error(err))
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
		log.LogError("BP creation error", zap.Error(err))
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
	log.LogInfo("Starting GenerateQuickBindingPolicyYAML handler")

	// Define a struct to parse the request - same as CreateQuickBindingPolicy
	type ResourceConfig struct {
		Type       string `json:"type"`       // Resource type (e.g., "deployments", "namespaces")
		CreateOnly bool   `json:"createOnly"` // Whether to use createOnly mode for this resource
		APIGroup   string `json:"apiGroup"`   // Optional API group for the resource (for CRDs)
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
		log.LogError("JSON binding error", zap.Error(err))
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	log.LogError("Receiced request", zap.Any("request", request))

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

	// Track if we have CRDs to add
	hasCRDs := false
	crdAPIGroups := make(map[string]string)

	// First check for custom resources that will need CRDs
	for _, resourceCfg := range resourceConfigs {
		resource := resourceCfg.Type

		if isKubernetesBuiltInResource(resource) {
			continue
		}

		apiGroup := ""
		// Check if original request has apiGroup in the matching resource
		for _, origRes := range request.Resources {
			if origRes.Type == resource && origRes.APIGroup != "" {
				apiGroup = origRes.APIGroup
				break
			}
		}

		if apiGroup == "" {
			singular := strings.TrimSuffix(resource, "s")
			if strings.HasSuffix(resource, "cds") || strings.HasSuffix(resource, "eds") {
				rootName := singular[:len(singular)-1]
				apiGroup = fmt.Sprintf("%s.io", rootName)
			} else {
				apiGroup = fmt.Sprintf("%s.k8s.io", singular)
			}
		}

		crdAPIGroups[resource] = apiGroup
		hasCRDs = true
	}

	// If we have custom resources, add rule(s) for CustomResourceDefinitions
	if hasCRDs {
		log.LogDebug("Adding CustomResourceDefinitions to binding policy")

		// Check if customresourcedefinitions is already in the resources list
		hasExplicitCRDResource := false
		for _, res := range resourceConfigs {
			if res.Type == "customresourcedefinitions" {
				hasExplicitCRDResource = true
				break
			}
		}

		if hasExplicitCRDResource {
			log.LogDebug("User explicitly specified CustomResourceDefinitions resource, using workload labels")

			crdRule := map[string]interface{}{
				"apiGroup":  "apiextensions.k8s.io",
				"resources": []string{"customresourcedefinitions"},
				"objectSelectors": []interface{}{
					map[string]interface{}{
						"matchLabels": request.WorkloadLabels,
					},
				},
			}
			downsyncRules = append([]interface{}{crdRule}, downsyncRules...)
		} else {
			specificCRDNames := getCRDNamesFromResources(crdAPIGroups)

			if len(specificCRDNames) > 0 {
				log.LogDebug("Adding specific CRDs to binding policy", zap.Any("specificCRDNames", specificCRDNames))

				for _, crdName := range specificCRDNames {
					log.LogDebug("Adding individual CRD rule", zap.String("crdName", crdName))

					// Individual CRD rule with explicit name matching
					crdRule := map[string]interface{}{
						"apiGroup":  "apiextensions.k8s.io",
						"resources": []string{"customresourcedefinitions"},
						"objectSelectors": []interface{}{
							map[string]interface{}{
								"matchNames": []string{crdName},
							},
						},
					}

					// Add individual CRD rule (at the beginning, so CRDs are created first)
					downsyncRules = append([]interface{}{crdRule}, downsyncRules...)
				}
			}
		}
	}

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

		if !isKubernetesBuiltInResource(resource) {
			// For CRDs, we need to specify the apiGroup
			apiGroup := crdAPIGroups[resource]
			downsyncRule["apiGroup"] = apiGroup
			log.LogDebug("Adding CRD resource with apiGroup", zap.String("resource", resource), zap.String("apiGroup", apiGroup))
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
		log.LogError("YAML marshaling error", zap.Error(err))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to generate YAML: %s", err.Error())})
		return
	}
	rawYAML := string(yamlData)
	log.LogDebug("Generated YAML", zap.String("rawYAML", rawYAML))

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

func isKubernetesBuiltInResource(resource string) bool {
	// Common built-in Kubernetes resources
	builtInResources := []string{
		"pods", "services", "deployments", "statefulsets", "daemonsets",
		"configmaps", "secrets", "namespaces", "persistentvolumes", "persistentvolumeclaims",
		"serviceaccounts", "roles", "rolebindings", "clusterroles", "clusterrolebindings",
		"ingresses", "jobs", "cronjobs", "events", "horizontalpodautoscalers",
		"endpoints", "replicasets", "networkpolicies", "limitranges", "resourcequotas",
		"customresourcedefinitions", "priorityclasses", "storageclasses",
	}

	for _, builtIn := range builtInResources {
		if builtIn == resource {
			return true
		}
	}
	return false
}

// Helper function to get CRD full names from resource types and API groups
func getCRDNamesFromResources(resourceAPIGroups map[string]string) []string {
	crdNames := []string{}

	for resource, apiGroup := range resourceAPIGroups {
		crdName := fmt.Sprintf("%s.%s", resource, apiGroup)

		log.LogDebug("Generated CRD name for resource type", zap.String("crdName", crdName), zap.String("resource", resource))
		crdNames = append(crdNames, crdName)
	}

	return crdNames
}
