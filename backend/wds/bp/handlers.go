package bp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/utils"
	"go.uber.org/zap"
	"gopkg.in/yaml.v2"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
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
	listOptions := metav1.ListOptions{}

	// Get all binding policies
	bpList, err := c.BindingPolicies().List(context.TODO(), listOptions)
	if err != nil {
		fmt.Printf("Debug - List error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to list binding policies: %s", err.Error())})
		return
	}

	// Log the raw namespace values for debugging
	for i, bp := range bpList.Items {
		fmt.Printf("Debug - GetAllBp - Raw BP #%d: name=%s, namespace=%s\n", i, bp.Name, bp.Namespace)
	}

	// Create a slice to hold the enhanced binding policies
	bpsWithStatus := make([]BindingPolicyWithStatus, 0, len(bpList.Items))

	// Add YAML representation and status to each policy
	for i := range bpList.Items {
		yamlData, err := yaml.Marshal(bpList.Items[i])
		if err != nil {
			log.LogError("Yaml Marshal failed", zap.String("error", err.Error()))
			continue
		}

		// Debug the YAML to check for namespace
		fmt.Printf("Debug - GetAllBp - BP %s YAML excerpt:\n", bpList.Items[i].Name)
		yamlLines := strings.Split(string(yamlData), "\n")
		for j, line := range yamlLines {
			if strings.Contains(line, "namespace:") {
				fmt.Printf("Debug - YAML line %d: %s\n", j, line)
			}
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
					} else {
						// Use the binding policy's namespace if no namespace specified
						workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, bpList.Items[i].Namespace)
						if !contains(workloads, workloadItem) {
							workloads = append(workloads, workloadItem)
							fmt.Printf("Debug - GetAllBp - Added workload with default namespace: %s\n", workloadItem)
						}
					}
				}
			}

			// Add specific workloads from stored data
			for _, workload := range storedBP.SpecificWorkloads {
				// Ensure namespace is set for the workload
				namespace := workload.Namespace
				if namespace == "" {
					namespace = bpList.Items[i].Namespace
				}

				workloadDesc := fmt.Sprintf("Specific: %s/%s", workload.APIVersion, workload.Kind)
				if workload.Name != "" {
					workloadDesc += fmt.Sprintf(": %s", workload.Name)
				}
				workloadDesc += fmt.Sprintf(" (ns:%s)", namespace)

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
					} else {
						// Use the binding policy's namespace if no namespace is specified in the downsync rule
						workloadItem := fmt.Sprintf("%s (ns:%s)", workloadType, bpList.Items[i].Namespace)
						if !contains(workloads, workloadItem) {
							workloads = append(workloads, workloadItem)
							fmt.Printf("Debug - GetAllBp - Added workload with policy namespace: %s\n", workloadItem)
						}
					}
				}
			}

			// Try to extract from annotations if there's any workload info
			if annotations := bpList.Items[i].Annotations; annotations != nil {
				// Check for specificWorkloads annotation (comma-separated APIVersion,Kind,Name,Namespace)
				if specificWorkloads, ok := annotations["specificWorkloads"]; ok && specificWorkloads != "" {
					parts := strings.Split(specificWorkloads, ",")
					if len(parts) >= 4 {
						apiVersion := parts[0]
						kind := parts[1]
						name := parts[2]
						namespace := parts[3]

						// If namespace is empty, use the BP's namespace
						if namespace == "" {
							namespace = bpList.Items[i].Namespace
						}

						workloadDesc := fmt.Sprintf("Specific: %s/%s: %s (ns:%s)",
							apiVersion, kind, name, namespace)

						if !contains(workloads, workloadDesc) {
							workloads = append(workloads, workloadDesc)
							fmt.Printf("Debug - GetAllBp - Added workload from specificWorkloads annotation: %s\n", workloadDesc)
						}
					}
				}

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
						workloadNamespace = bpList.Items[i].Namespace
					}

					workloadDesc := fmt.Sprintf("Specific: %s/%s: %s (ns:%s)",
						apiVersion, kind, specificWorkload, workloadNamespace)

					if !contains(workloads, workloadDesc) {
						workloads = append(workloads, workloadDesc)
						fmt.Printf("Debug - GetAllBp - Added specific workload from annotations: %s\n", workloadDesc)
					}
				}

				// Check for workload-ids annotation (used in quick binding policies)
				if workloadIds, ok := annotations["workload-ids"]; ok && workloadIds != "" {
					for _, workloadId := range strings.Split(workloadIds, ",") {
						if workloadId == "" {
							continue
						}

						// Parse the workload ID to extract namespace info
						_, _, _, workloadNamespace := parseWorkloadIdentifier(workloadId)

						// If workload ID already has namespace format, use it directly
						if strings.Contains(workloadId, "ns:") {
							if !contains(workloads, workloadId) {
								workloads = append(workloads, workloadId)
								fmt.Printf("Debug - GetAllBp - Added workload with embedded namespace: %s\n", workloadId)
							}
						} else if workloadNamespace != "" {
							// Add the namespace to the workload ID
							formattedWorkloadId := fmt.Sprintf("%s (ns:%s)", workloadId, workloadNamespace)
							if !contains(workloads, formattedWorkloadId) {
								workloads = append(workloads, formattedWorkloadId)
								fmt.Printf("Debug - GetAllBp - Added workload with parsed namespace: %s\n", formattedWorkloadId)
							}
						} else {
							// Use the BP namespace as default
							formattedWorkloadId := fmt.Sprintf("%s (ns:%s)", workloadId, bpList.Items[i].Namespace)
							if !contains(workloads, formattedWorkloadId) {
								workloads = append(workloads, formattedWorkloadId)
								fmt.Printf("Debug - GetAllBp - Added workload with BP namespace: %s\n", formattedWorkloadId)
							}
						}
					}
				}

				// Single workload-id annotation
				if workloadId, ok := annotations["workload-id"]; ok && workloadId != "" {
					// Parse the workload ID to extract namespace info
					_, _, _, workloadNamespace := parseWorkloadIdentifier(workloadId)

					// Format with namespace
					if workloadNamespace == "" {
						workloadNamespace = bpList.Items[i].Namespace
					}

					formattedWorkloadId := fmt.Sprintf("%s (ns:%s)", workloadId, workloadNamespace)
					if !contains(workloads, formattedWorkloadId) {
						workloads = append(workloads, formattedWorkloadId)
						fmt.Printf("Debug - GetAllBp - Added workload from workload-id annotation: %s\n", formattedWorkloadId)
					}
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
		// Debug to identify namespace issue
		fmt.Printf("Debug - GetAllBp - Processing BP %s, namespace from API: '%s'\n", bp.Name, bp.Namespace)

		// Try to get namespace from YAML if it's empty in the API object
		namespace := bp.Namespace
		if namespace == "" {
			// Try to extract from stored policy first
			if storedBP, exists := uiCreatedPolicies[bp.Name]; exists && storedBP.Namespace != "" {
				namespace = storedBP.Namespace
				fmt.Printf("Debug - GetAllBp - Using namespace from stored policy: '%s'\n", namespace)
			} else {
				// Try to extract from YAML
				yamlStr, ok := bp.Annotations["yaml"]
				if ok && yamlStr != "" {
					// Look for "namespace:" in the YAML content
					if idx := strings.Index(yamlStr, "namespace:"); idx != -1 {
						// Extract the namespace value
						afterNamespace := yamlStr[idx+10:] // "namespace:" is 10 chars
						// Find the next newline or end of string
						endIdx := strings.Index(afterNamespace, "\n")
						if endIdx == -1 {
							endIdx = len(afterNamespace)
						}

						extractedNs := strings.TrimSpace(afterNamespace[:endIdx])
						extractedNs = strings.Trim(extractedNs, "\"'")

						if extractedNs != "" {
							namespace = extractedNs
							fmt.Printf("Debug - GetAllBp - Extracted namespace from YAML content: '%s'\n", namespace)
						}
					}

					// Also try proper YAML parsing
					var tempObj struct {
						Metadata struct {
							Namespace string `yaml:"namespace"`
						} `yaml:"metadata"`
					}
					if err := yaml.Unmarshal([]byte(yamlStr), &tempObj); err == nil && tempObj.Metadata.Namespace != "" {
						namespace = tempObj.Metadata.Namespace
						fmt.Printf("Debug - GetAllBp - Extracted namespace from YAML parsing: '%s'\n", namespace)
					}
				}

				// Try to extract from any workload that has a namespace
				if namespace == "" && len(bp.Workloads) > 0 {
					for _, workload := range bp.Workloads {
						if nsMatch := regexp.MustCompile(`\(ns:([^)]+)\)`).FindStringSubmatch(workload); len(nsMatch) > 1 {
							namespace = nsMatch[1]
							fmt.Printf("Debug - GetAllBp - Extracted namespace from workload: '%s'\n", namespace)
							break
						}
					}
				}
			}
		}

		if namespace == "" {
			namespace = "default"
			fmt.Printf("Debug - GetAllBp - Using default namespace as fallback\n")
		}

		// Convert each binding policy to a map for customization
		policyMap := map[string]interface{}{
			"name":           bp.Name,
			"namespace":      namespace,
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

		// Update the YAML to include the correct namespace
		yamlStr, ok := bp.Annotations["yaml"]
		if ok && yamlStr != "" && namespace != "" {
			// Try to update the YAML to include the correct namespace
			policyMap["yaml"] = yamlStr

			// Only attempt to fix the YAML if the namespace doesn't match
			if !strings.Contains(yamlStr, "namespace: "+namespace) {
				// Create a copy of the binding policy with the correct namespace
				bpCopy := bp.BindingPolicy.DeepCopy()
				bpCopy.Namespace = namespace

				// First update the embedded YAML in annotations using our sanitizer
				if bpCopy.Annotations == nil {
					bpCopy.Annotations = make(map[string]string)
				}

				// Update the embedded YAML if it exists
				if embeddedYaml, ok := bpCopy.Annotations["yaml"]; ok && embeddedYaml != "" {
					// Use our utility function to properly update the embedded YAML
					updatedEmbeddedYaml := sanitizeEmbeddedYaml(embeddedYaml, namespace)
					bpCopy.Annotations["yaml"] = updatedEmbeddedYaml
					fmt.Printf("Debug - GetAllBp - Sanitized embedded YAML in annotations\n")
				}

				// Marshal the entire object with fixed embedded YAML
				if finalYaml, err := yaml.Marshal(bpCopy); err == nil {
					policyMap["yaml"] = string(finalYaml)
					fmt.Printf("Debug - GetAllBp - Updated both top-level and embedded YAML with namespace: %s\n", namespace)
				} else {
					// If that fails, at least ensure the top-level YAML has the correct namespace
					if fixedYaml, err := yaml.Marshal(bpCopy); err == nil {
						policyMap["yaml"] = string(fixedYaml)
						fmt.Printf("Debug - GetAllBp - Updated YAML with correct namespace: %s\n", namespace)
					}
				}
			}
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

	// First parse YAML into a map to extract basic metadata
	var yamlMap map[string]interface{}
	if err := yaml.Unmarshal(bpRawYamlBytes, &yamlMap); err != nil {
		fmt.Printf("Debug - Initial YAML parsing error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid YAML format: %s", err.Error())})
		return
	}

	// Debug print the top-level keys in the YAML
	fmt.Printf("Debug - YAML top-level keys: %v\n", getMapKeys(yamlMap))

	// Extract and validate critical fields
	var metadataMap map[string]interface{}
	if metaRaw, ok := yamlMap["metadata"]; ok {
		// Try to cast to map[string]interface{} first
		if meta, ok := metaRaw.(map[string]interface{}); ok {
			metadataMap = meta
			fmt.Printf("Debug - Found metadata as map[string]interface{}\n")
		} else if meta, ok := metaRaw.(map[interface{}]interface{}); ok {
			// Convert map[interface{}]interface{} to map[string]interface{}
			metadataMap = make(map[string]interface{})
			for k, v := range meta {
				if kStr, ok := k.(string); ok {
					metadataMap[kStr] = v
				}
			}
			fmt.Printf("Debug - Found metadata as map[interface{}]interface{}, converted to map[string]interface{}\n")
		} else {
			fmt.Printf("Debug - Metadata is not a valid map: %T\n", metaRaw)
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata section is not properly formatted in binding policy"})
			return
		}
	} else {
		// Try alternate parsing approach with struct
		var bp struct {
			Metadata struct {
				Name      string `yaml:"name"`
				Namespace string `yaml:"namespace"`
			} `yaml:"metadata"`
		}
		if err := yaml.Unmarshal(bpRawYamlBytes, &bp); err == nil && bp.Metadata.Name != "" {
			// Found metadata through struct parsing
			metadataMap = map[string]interface{}{
				"name":      bp.Metadata.Name,
				"namespace": bp.Metadata.Namespace,
			}
			fmt.Printf("Debug - Found metadata through struct parsing: name=%s namespace=%s\n",
				bp.Metadata.Name, bp.Metadata.Namespace)
		} else {
			fmt.Printf("Debug - No metadata found in YAML and alternate parsing failed\n")
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata section is required in binding policy"})
			return
		}
	}

	// Extract specific workloads information if present
	specificWorkloads := []WorkloadInfo{}
	if specRaw, ok := yamlMap["spec"]; ok {
		// Try to extract spec as map[string]interface{}
		var specObj map[string]interface{}
		if spec, ok := specRaw.(map[string]interface{}); ok {
			specObj = spec
		} else if spec, ok := specRaw.(map[interface{}]interface{}); ok {
			// Convert map[interface{}]interface{} to map[string]interface{}
			specObj = make(map[string]interface{})
			for k, v := range spec {
				if kStr, ok := k.(string); ok {
					specObj[kStr] = v
				}
			}
		}

		if specObj != nil {
			// Try to extract workloads
			if workloadsRaw, exists := specObj["workloads"]; exists {
				var workloadsList []interface{}
				if wl, ok := workloadsRaw.([]interface{}); ok {
					workloadsList = wl
				}

				fmt.Printf("Debug - Found workloads section with %d entries\n", len(workloadsList))

				for i, workloadObj := range workloadsList {
					// Try to extract workload as map
					var workload map[string]interface{}
					if w, ok := workloadObj.(map[string]interface{}); ok {
						workload = w
					} else if w, ok := workloadObj.(map[interface{}]interface{}); ok {
						// Convert map[interface{}]interface{} to map[string]interface{}
						workload = make(map[string]interface{})
						for k, v := range w {
							if kStr, ok := k.(string); ok {
								workload[kStr] = v
							}
						}
					}

					if workload != nil {
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

						// Extract name and namespace from metadata
						name := ""
						namespace := ""
						if metaRaw, ok := workload["metadata"]; ok {
							var metaObj map[string]interface{}
							if meta, ok := metaRaw.(map[string]interface{}); ok {
								metaObj = meta
							} else if meta, ok := metaRaw.(map[interface{}]interface{}); ok {
								// Convert map[interface{}]interface{} to map[string]interface{}
								metaObj = make(map[string]interface{})
								for k, v := range meta {
									if kStr, ok := k.(string); ok {
										metaObj[kStr] = v
									}
								}
							}

							if metaObj != nil {
								if n, ok := metaObj["name"].(string); ok {
									name = n
								}
								if ns, ok := metaObj["namespace"].(string); ok {
									namespace = ns
								}
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
		TypeMeta: metav1.TypeMeta{
			APIVersion: "control.kubestellar.io/v1alpha1",
			Kind:       "BindingPolicy",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
		},
	}

	// Now parse the full YAML into the binding policy
	if err := yaml.Unmarshal(bpRawYamlBytes, newBP); err != nil {
		fmt.Printf("Debug - Full YAML parsing error: %v\n", err)
		// Continue anyway, we'll fix what we can
	}

	// Try using the more robust Kubernetes deserializer
	parsedBP, err := getBpObjFromYaml(bpRawYamlBytes)
	if err == nil && parsedBP != nil {
		// Successfully parsed with Kubernetes deserializer
		fmt.Printf("Debug - Successfully parsed BP with Kubernetes deserializer\n")
		newBP = parsedBP
	} else {
		fmt.Printf("Debug - Kubernetes deserializer failed: %v, continuing with plain yaml parse\n", err)
	}

	// Double-check that we didn't lose the name/namespace during unmarshal
	if newBP.Name == "" {
		newBP.Name = name
	}

	// Ensure namespace from YAML takes precedence over default
	if ns, ok := metadataMap["namespace"].(string); ok && ns != "" {
		// If namespace was explicitly specified in the YAML, always use it
		newBP.Namespace = ns
		fmt.Printf("Debug - Using explicit namespace from YAML metadata: %s\n", ns)
	} else if newBP.Namespace == "" {
		// Only fall back to default if no namespace is specified anywhere
		newBP.Namespace = namespace
		fmt.Printf("Debug - Using fallback namespace: %s\n", namespace)
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

	// Update YAML string in annotations if needed
	if newBP.Annotations == nil {
		newBP.Annotations = make(map[string]string)
	}
	newBP.Annotations["yaml"] = string(fixedYAML)
	fmt.Printf("Debug - Updated annotations with proper YAML\n")

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
	fmt.Printf("Debug - Creating binding policy in namespace: %s\n", newBP.Namespace)
	fmt.Printf("Debug - BindingPolicy has %d cluster selectors and %d downsync rules\n",
		len(newBP.Spec.ClusterSelectors), len(newBP.Spec.Downsync))

	// Log cluster selectors for debugging
	for i, selector := range newBP.Spec.ClusterSelectors {
		fmt.Printf("Debug - ClusterSelector #%d has %d matchLabels\n", i, len(selector.MatchLabels))
		for k, v := range selector.MatchLabels {
			fmt.Printf("Debug - ClusterSelector #%d label: %s=%s\n", i, k, v)
		}
	}

	// Log downsync rules for debugging
	for i, downsync := range newBP.Spec.Downsync {
		apiGroup := "core"
		if downsync.APIGroup != nil {
			apiGroup = *downsync.APIGroup
		}
		fmt.Printf("Debug - Downsync #%d: APIGroup=%s, Resources=%v, Namespaces=%v, ObjectNames=%v, WantSingletonReportedState=%v\n",
			i, apiGroup, downsync.Resources, downsync.Namespaces, downsync.ObjectNames, downsync.WantSingletonReportedState)
	}

	_, err = c.BindingPolicies().Create(context.TODO(), newBP, metav1.CreateOptions{})
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

	err = c.BindingPolicies().Delete(context.TODO(), name, metav1.DeleteOptions{})
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
	listOptions := metav1.ListOptions{}

	err = c.BindingPolicies().DeleteCollection(context.TODO(), metav1.DeleteOptions{}, listOptions)
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
	bp, err := c.BindingPolicies().Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		fmt.Printf("Debug - GetBpStatus - Direct Get error: %v\n", err)

		// Try to list all binding policies to see if it exists
		bpList, listErr := c.BindingPolicies().List(context.TODO(), metav1.ListOptions{})
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
	updatedBp, err := c.BindingPolicies().Patch(context.TODO(), bpName, types.MergePatchType, jsonBytes, metav1.PatchOptions{})
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

	// Parse direct workload ID if provided (may include namespace)
	if bpRequest.WorkloadId != "" {
		apiGroup, kind, name, workloadNamespace := parseWorkloadIdentifier(bpRequest.WorkloadId)

		// If namespace is explicitly provided in workloadId, use it
		if workloadNamespace != "" {
			// If workload has a specific namespace, add it to namespaces list if not already there
			hasNamespace := false
			for _, ns := range bpRequest.WorkloadSelectors.Namespaces {
				if ns == workloadNamespace {
					hasNamespace = true
					break
				}
			}
			if !hasNamespace {
				bpRequest.WorkloadSelectors.Namespaces = append(bpRequest.WorkloadSelectors.Namespaces, workloadNamespace)
			}
		}

		// Add to specific workloads if kind and name are available
		if kind != "" && name != "" {
			// If namespace wasn't in workloadId, use BP namespace
			if workloadNamespace == "" {
				workloadNamespace = bpRequest.Namespace
			}

			bpRequest.WorkloadSelectors.Workloads = append(bpRequest.WorkloadSelectors.Workloads, WorkloadInfo{
				APIVersion: fmt.Sprintf("%s/v1", apiGroup),
				Kind:       kind,
				Name:       name,
				Namespace:  workloadNamespace,
			})
		}
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

	// Ensure we have the proper YAML in annotations
	if newBP.Annotations == nil {
		newBP.Annotations = make(map[string]string)
	}
	newBP.Annotations["yaml"] = rawYAML
	fmt.Printf("Debug - Added YAML to annotations\n")

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Create the binding policy
	fmt.Printf("Debug - Creating binding policy in namespace: %s\n", newBP.Namespace)
	fmt.Printf("Debug - BindingPolicy has %d cluster selectors and %d downsync rules\n",
		len(newBP.Spec.ClusterSelectors), len(newBP.Spec.Downsync))

	// Log cluster selectors for debugging
	for i, selector := range newBP.Spec.ClusterSelectors {
		fmt.Printf("Debug - ClusterSelector #%d has %d matchLabels\n", i, len(selector.MatchLabels))
		for k, v := range selector.MatchLabels {
			fmt.Printf("Debug - ClusterSelector #%d label: %s=%s\n", i, k, v)
		}
	}

	// Log downsync rules for debugging
	for i, downsync := range newBP.Spec.Downsync {
		apiGroup := "core"
		if downsync.APIGroup != nil {
			apiGroup = *downsync.APIGroup
		}
		fmt.Printf("Debug - Downsync #%d: APIGroup=%s, Resources=%v, Namespaces=%v, ObjectNames=%v, WantSingletonReportedState=%v\n",
			i, apiGroup, downsync.Resources, downsync.Namespaces, downsync.ObjectNames, downsync.WantSingletonReportedState)
	}

	_, err = c.BindingPolicies().Create(context.TODO(), newBP, metav1.CreateOptions{})
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
	type QuickBindingPolicyRequest struct {
		WorkloadIds []string `json:"workloadIds"` // Array of workload IDs
		ClusterIds  []string `json:"clusterIds"`  // Array of cluster IDs
		PolicyName  string   `json:"policyName"`  // Optional custom name for the policy
		Namespace   string   `json:"namespace"`   // Optional namespace
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	// Validate required fields
	if len(request.WorkloadIds) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one workloadId is required"})
		return
	}

	if len(request.ClusterIds) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one clusterId is required"})
		return
	}

	// Try to extract namespace from the first workload (prioritize workload namespace)
	workloadNamespace := ""
	if len(request.WorkloadIds) > 0 {
		_, _, _, extractedNamespace := parseWorkloadIdentifier(request.WorkloadIds[0])
		if extractedNamespace != "" {
			workloadNamespace = extractedNamespace
			fmt.Printf("Debug - Extracted namespace from workload: %s\n", workloadNamespace)
		}
	}

	// Set namespace priority: 1. Workload namespace, 2. Provided namespace, 3. Default
	namespace := "default"
	if workloadNamespace != "" {
		namespace = workloadNamespace
		fmt.Printf("Debug - Using namespace from workload: %s\n", namespace)
	} else if request.Namespace != "" {
		namespace = request.Namespace
		fmt.Printf("Debug - Using namespace from request: %s\n", namespace)
	} else {
		fmt.Printf("Debug - Using default namespace\n")
	}

	// Generate a policy name if not provided
	policyName := request.PolicyName
	if policyName == "" {
		// Create a name based on the first workload and first cluster ID
		policyName = fmt.Sprintf("%s-to-%s", request.WorkloadIds[0], request.ClusterIds[0])
		if len(request.WorkloadIds) > 1 || len(request.ClusterIds) > 1 {
			policyName += "-multi"
		}
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
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{},
			"downsync":         []interface{}{},
			"destinations":     []interface{}{}, // Add explicit destinations
		},
	}

	// Add all cluster selectors
	clusterSelectors := []interface{}{}
	destinations := []interface{}{} // Add this new array for destinations
	for _, clusterId := range request.ClusterIds {
		clusterSelectors = append(clusterSelectors, map[string]interface{}{
			"matchLabels": map[string]string{
				"kubernetes.io/cluster-name": clusterId,
			},
		})

		// Add explicit destination for each cluster ID
		destinations = append(destinations, map[string]interface{}{
			"clusterId": clusterId, // This is the correct camelCase for the field
		})

		// Save the cluster ID in annotations
		metadata := policyObj["metadata"].(map[string]interface{})
		annotations := metadata["annotations"].(map[string]string)
		annotations["cluster-ids"] += clusterId + ","
	}
	policyObj["spec"].(map[string]interface{})["clusterSelectors"] = clusterSelectors
	policyObj["spec"].(map[string]interface{})["destinations"] = destinations // Set the destinations

	// Process each workload ID
	workloadAnnotations := ""
	apiGroups := make(map[string]bool)
	resources := make(map[string]bool)
	specificWorkloads := []WorkloadInfo{}

	for _, workloadId := range request.WorkloadIds {
		workloadAnnotations += workloadId + ","

		// Parse workload ID to extract information using the utility function
		apiGroup, kind, workloadName, workloadNamespace := parseWorkloadIdentifier(workloadId)

		// If workload namespace is not specified, use the binding policy namespace
		if workloadNamespace == "" {
			workloadNamespace = namespace
		}

		// Convert kind to resource (plural)
		if kind != "" {
			resource := strings.ToLower(kind)
			if !strings.HasSuffix(resource, "s") {
				resource += "s"
			}

			// Store the API group and resource for downsync rules
			apiGroups[apiGroup] = true
			resources[resource] = true

			// If specific workload name is available, store it
			if workloadName != "" {
				specificWorkloads = append(specificWorkloads, WorkloadInfo{
					APIVersion: fmt.Sprintf("%s/v1", apiGroup),
					Kind:       kind,
					Name:       workloadName,
					Namespace:  workloadNamespace,
				})
			}
		}
	}

	// Add workload IDs to annotations
	metadata := policyObj["metadata"].(map[string]interface{})
	annotations := metadata["annotations"].(map[string]string)
	annotations["workload-ids"] = strings.TrimSuffix(workloadAnnotations, ",")

	// Create downsync rules from collected API groups and resources
	downsyncRules := []interface{}{}

	// Create a mapping of namespaces used by workloads
	namespacesToResources := make(map[string][]string)

	// Group resources by namespace
	for _, workload := range specificWorkloads {
		// Get the current resources for this namespace
		resources, ok := namespacesToResources[workload.Namespace]
		if !ok {
			resources = []string{}
		}

		// Add the resource if not already there
		resource := strings.ToLower(workload.Kind)
		if !strings.HasSuffix(resource, "s") {
			resource += "s"
		}

		if !contains(resources, resource) {
			resources = append(resources, resource)
		}

		namespacesToResources[workload.Namespace] = resources
	}

	// If no specific workloads with namespaces, use the binding policy namespace
	if len(namespacesToResources) == 0 {
		for apiGroup := range apiGroups {
			resourcesForGroup := []string{}
			for resource := range resources {
				resourcesForGroup = append(resourcesForGroup, resource)
			}

			downsyncRules = append(downsyncRules, map[string]interface{}{
				"apiGroup":   apiGroup,
				"resources":  resourcesForGroup,
				"namespaces": []string{namespace},
			})
		}
	} else {
		// Create downsync rules for each namespace
		for ns, resourceList := range namespacesToResources {
			for apiGroup := range apiGroups {
				downsyncRules = append(downsyncRules, map[string]interface{}{
					"apiGroup":   apiGroup,
					"resources":  resourceList,
					"namespaces": []string{ns},
				})
			}
		}
	}

	policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules

	// Add specific workloads section if needed
	if len(specificWorkloads) > 0 {
		workloadsSection := []interface{}{}
		for _, workload := range specificWorkloads {
			workloadObj := map[string]interface{}{
				"apiVersion": workload.APIVersion,
				"kind":       workload.Kind,
				"metadata": map[string]interface{}{
					"name":      workload.Name,
					"namespace": workload.Namespace,
				},
			}
			workloadsSection = append(workloadsSection, workloadObj)
		}
		policyObj["spec"].(map[string]interface{})["workloads"] = workloadsSection

		// Also store the workload info in annotations for proper binding object creation
		workloadAnnotation := ""
		for _, workload := range specificWorkloads {
			if workloadAnnotation != "" {
				workloadAnnotation += ","
			}
			workloadAnnotation += fmt.Sprintf("%s,%s,%s,%s",
				workload.APIVersion,
				workload.Kind,
				workload.Name,
				workload.Namespace)
		}

		metadata := policyObj["metadata"].(map[string]interface{})
		annotations := metadata["annotations"].(map[string]string)
		annotations["specificWorkloads"] = workloadAnnotation
	}
	if len(specificWorkloads) > 0 {
		// First find all unique namespaces used by workloads
		uniqueNamespaces := make(map[string]bool)
		for _, workload := range specificWorkloads {
			if workload.Namespace != "" {
				uniqueNamespaces[workload.Namespace] = true
			}
		}

		// Add each namespace as a cluster-scoped resource
		for ns := range uniqueNamespaces {
			// Check if we need to add the namespace to workloadsSection
			namespaceObj := map[string]interface{}{
				"apiVersion": "v1",
				"kind":       "Namespace",
				"metadata": map[string]interface{}{
					"name": ns,
				},
			}

			if workloadsSection, ok := policyObj["spec"].(map[string]interface{})["workloads"].([]interface{}); ok {
				policyObj["spec"].(map[string]interface{})["workloads"] = append(workloadsSection, namespaceObj)
			}

			// Also ensure we have a downsync rule that includes namespaces
			namespaceDownsync := map[string]interface{}{
				"apiGroup":    "", // Empty for core API group
				"resources":   []string{"namespaces"},
				"objectNames": []string{ns},
			}

			// Add to downsync rules
			downsyncRules = append(downsyncRules, namespaceDownsync)
		}
	}

	// Update the downsync rules in the policy
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

	// Ensure specific workloads are properly represented in the DownsyncPolicyClause
	if len(specificWorkloads) > 0 {
		for _, workload := range specificWorkloads {
			resourceName := strings.ToLower(workload.Kind)
			if !strings.HasSuffix(resourceName, "s") {
				resourceName += "s"
			}

			apiGroup := strings.Split(workload.APIVersion, "/")[0]

			// Find if we have a downsync rule that matches this workload's API group and resource
			found := false
			for i := range newBP.Spec.Downsync {
				currentApiGroup := "core"
				if newBP.Spec.Downsync[i].APIGroup != nil {
					currentApiGroup = *newBP.Spec.Downsync[i].APIGroup
				}

				if currentApiGroup == apiGroup &&
					contains(newBP.Spec.Downsync[i].Resources, resourceName) &&
					contains(newBP.Spec.Downsync[i].Namespaces, workload.Namespace) {
					// We have a matching rule, ensure ObjectNames includes this specific workload
					if !contains(newBP.Spec.Downsync[i].ObjectNames, workload.Name) {
						newBP.Spec.Downsync[i].ObjectNames = append(newBP.Spec.Downsync[i].ObjectNames, workload.Name)
					}

					// Set WantSingletonReportedState to true to ensure status is reported back
					newBP.Spec.Downsync[i].WantSingletonReportedState = true

					found = true
					break
				}
			}

			// If no matching rule was found, create a new one
			if !found {
				newApiGroup := apiGroup
				newDownsync := v1alpha1.DownsyncPolicyClause{
					DownsyncObjectTest: v1alpha1.DownsyncObjectTest{
						APIGroup:    &newApiGroup,
						Resources:   []string{resourceName},
						Namespaces:  []string{workload.Namespace},
						ObjectNames: []string{workload.Name},
					},
					DownsyncModulation: v1alpha1.DownsyncModulation{
						WantSingletonReportedState: true,
					},
				}
				newBP.Spec.Downsync = append(newBP.Spec.Downsync, newDownsync)
			}
		}
	} else {
		fmt.Printf("Debug - No specific workloads found, creating generic downsync rules\n")

		// Apply to all resources in all namespaces if no specific rules
		if len(newBP.Spec.Downsync) == 0 {
			for apiGroup := range apiGroups {
				var resourceList []string
				for resource := range resources {
					resourceList = append(resourceList, resource)
				}

				if len(resourceList) > 0 {
					coreGroup := apiGroup
					newDownsync := v1alpha1.DownsyncPolicyClause{
						DownsyncObjectTest: v1alpha1.DownsyncObjectTest{
							APIGroup:   &coreGroup,
							Resources:  resourceList,
							Namespaces: []string{namespace},
						},
						DownsyncModulation: v1alpha1.DownsyncModulation{
							WantSingletonReportedState: true,
						},
					}
					newBP.Spec.Downsync = append(newBP.Spec.Downsync, newDownsync)
				}
			}
		}
	}

	// Validate and clean up cluster selectors to ensure WECs are properly matched
	if len(newBP.Spec.ClusterSelectors) == 0 {
		fmt.Printf("Debug - No cluster selectors found, adding default ones\n")
		for _, clusterId := range request.ClusterIds {
			labelSelector := metav1.LabelSelector{
				MatchLabels: map[string]string{
					"kubernetes.io/cluster-name": clusterId,
				},
			}
			newBP.Spec.ClusterSelectors = append(newBP.Spec.ClusterSelectors, labelSelector)
		}
	}

	// Ensure the correct namespace is set throughout the binding policy
	ensureCorrectNamespace(newBP, namespace)
	fmt.Printf("Debug - Ensured correct namespace '%s' is set in binding policy\n", namespace)

	// Build ClusterSelectors for storage
	clusterSelectorsStore := []map[string]string{}
	for _, clusterId := range request.ClusterIds {
		clusterSelectorsStore = append(clusterSelectorsStore, map[string]string{
			"kubernetes.io/cluster-name": clusterId,
		})
	}

	// Create a StoredBindingPolicy for cache
	storedBP := &StoredBindingPolicy{
		Name:              policyName,
		Namespace:         namespace,
		ClusterSelectors:  clusterSelectorsStore,
		APIGroups:         []string{},
		Resources:         []string{},
		Namespaces:        []string{namespace},
		SpecificWorkloads: specificWorkloads,
		RawYAML:           rawYAML,
	}

	// Extract API groups and resources for storage
	for apiGroup := range apiGroups {
		storedBP.APIGroups = append(storedBP.APIGroups, apiGroup)
	}
	for resource := range resources {
		storedBP.Resources = append(storedBP.Resources, resource)
	}

	// Store policy in memory
	uiCreatedPolicies[policyName] = storedBP

	// Ensure the YAML is properly set in annotations
	if newBP.Annotations == nil {
		newBP.Annotations = make(map[string]string)
	}
	newBP.Annotations["yaml"] = rawYAML
	fmt.Printf("Debug - Set YAML in annotations for quick binding policy\n")

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Create the binding policy
	fmt.Printf("Debug - Creating binding policy in namespace: %s\n", newBP.Namespace)
	fmt.Printf("Debug - BindingPolicy has %d cluster selectors and %d downsync rules\n",
		len(newBP.Spec.ClusterSelectors), len(newBP.Spec.Downsync))

	// Log cluster selectors for debugging
	for i, selector := range newBP.Spec.ClusterSelectors {
		fmt.Printf("Debug - ClusterSelector #%d has %d matchLabels\n", i, len(selector.MatchLabels))
		for k, v := range selector.MatchLabels {
			fmt.Printf("Debug - ClusterSelector #%d label: %s=%s\n", i, k, v)
		}
	}

	// Log downsync rules for debugging
	for i, downsync := range newBP.Spec.Downsync {
		apiGroup := "core"
		if downsync.APIGroup != nil {
			apiGroup = *downsync.APIGroup
		}
		fmt.Printf("Debug - Downsync #%d: APIGroup=%s, Resources=%v, Namespaces=%v, ObjectNames=%v, WantSingletonReportedState=%v\n",
			i, apiGroup, downsync.Resources, downsync.Namespaces, downsync.ObjectNames, downsync.WantSingletonReportedState)
	}

	_, err = c.BindingPolicies().Create(context.TODO(), newBP, metav1.CreateOptions{})
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
			"status":         "inactive",
			"bindingMode":    "Downsync",
			"clusters":       request.ClusterIds,
			"workloads":      request.WorkloadIds,
			"clustersCount":  len(request.ClusterIds),
			"workloadsCount": len(request.WorkloadIds),
			"yaml":           rawYAML,
		},
	})
	// Ensure WEC clusters are properly registered
	if err := ensureWECClusterLabels(request.ClusterIds); err != nil {
		fmt.Printf("Warning - Error ensuring WEC cluster labels: %v\n", err)
		// Continue despite error - we'll try direct deployment
	}

	cmd := exec.Command("kubectl", "get", "pods", "-n", "kubestellar-system", "-l", "app=kubestellar-controller")
	output, err := cmd.CombinedOutput()
	controllerRunning := err == nil && strings.Contains(string(output), "Running")

	if !controllerRunning {
		fmt.Printf("Debug - KubeStellar controller not detected, deploying workloads directly\n")

		for _, workloadId := range request.WorkloadIds {
			apiGroup, kind, name, namespace := parseWorkloadIdentifier(workloadId)
			if namespace == "" {
				namespace = "default"
			}

			workload := WorkloadInfo{
				APIVersion: apiGroup + "/v1",
				Kind:       kind,
				Name:       name,
				Namespace:  namespace,
			}

			if err := deployWorkloadToWEC(workload, request.ClusterIds); err != nil {
				fmt.Printf("Error - Failed to deploy workload directly: %v\n", err)
			}
		}
	}
}

// GenerateQuickBindingPolicyYAML generates the YAML for a binding policy connecting workload(s) to cluster(s)
// without actually creating the policy
func GenerateQuickBindingPolicyYAML(ctx *gin.Context) {
	fmt.Printf("Debug - Starting GenerateQuickBindingPolicyYAML handler\n")

	// Define a struct to parse the request - similar to CreateQuickBindingPolicy
	type QuickBindingPolicyRequest struct {
		WorkloadIds []string `json:"workloadIds"` // Array of workload IDs
		ClusterIds  []string `json:"clusterIds"`  // Array of cluster IDs
		PolicyName  string   `json:"policyName"`  // Optional custom name for the policy
		Namespace   string   `json:"namespace"`   // Optional namespace
	}

	var request QuickBindingPolicyRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid JSON format: %s", err.Error())})
		return
	}

	// Validate required fields
	if len(request.WorkloadIds) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one workloadId is required"})
		return
	}
	if len(request.ClusterIds) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "at least one clusterId is required"})
		return
	}

	// Try to extract namespace from the first workload (prioritize workload namespace)
	workloadNamespace := ""
	if len(request.WorkloadIds) > 0 {
		_, _, _, extractedNamespace := parseWorkloadIdentifier(request.WorkloadIds[0])
		if extractedNamespace != "" {
			workloadNamespace = extractedNamespace
			fmt.Printf("Debug - Extracted namespace from workload: %s\n", workloadNamespace)
		}
	}

	// Set namespace priority: 1. Workload namespace, 2. Provided namespace, 3. Default
	namespace := "default"
	if workloadNamespace != "" {
		namespace = workloadNamespace
		fmt.Printf("Debug - Using namespace from workload: %s\n", namespace)
	} else if request.Namespace != "" {
		namespace = request.Namespace
		fmt.Printf("Debug - Using namespace from request: %s\n", namespace)
	} else {
		fmt.Printf("Debug - Using default namespace\n")
	}

	// Generate a policy name if not provided
	policyName := request.PolicyName
	if policyName == "" {
		// Create a name based on the first workload and first cluster ID
		policyName = fmt.Sprintf("%s-to-%s", request.WorkloadIds[0], request.ClusterIds[0])
		if len(request.WorkloadIds) > 1 || len(request.ClusterIds) > 1 {
			policyName += "-multi"
		}
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
				"creation-timestamp": time.Now().Format(time.RFC3339),
			},
		},
		"spec": map[string]interface{}{
			"clusterSelectors": []interface{}{},
			"downsync":         []interface{}{},
			"destinations":     []interface{}{}, // Add explicit destinations
		},
	}

	// Add all cluster selectors
	clusterSelectors := []interface{}{}
	destinations := []interface{}{} // Add this new array for destinations
	for _, clusterId := range request.ClusterIds {
		clusterSelectors = append(clusterSelectors, map[string]interface{}{
			"matchLabels": map[string]string{
				"kubernetes.io/cluster-name": clusterId,
			},
		})

		// Add explicit destination for each cluster ID
		destinations = append(destinations, map[string]interface{}{
			"clusterId": clusterId,
		})

		// Save the cluster ID in annotations
		metadata := policyObj["metadata"].(map[string]interface{})
		annotations := metadata["annotations"].(map[string]string)
		annotations["cluster-ids"] += clusterId + ","
	}
	policyObj["spec"].(map[string]interface{})["clusterSelectors"] = clusterSelectors
	policyObj["spec"].(map[string]interface{})["destinations"] = destinations // Set the destinations

	// Process each workload ID
	workloadAnnotations := ""
	apiGroups := make(map[string]bool)
	resources := make(map[string]bool)
	specificWorkloads := []WorkloadInfo{}

	for _, workloadId := range request.WorkloadIds {
		workloadAnnotations += workloadId + ","

		// Parse workload ID to extract information using the utility function
		apiGroup, kind, workloadName, workloadNamespace := parseWorkloadIdentifier(workloadId)

		// If workload namespace is not specified, use the binding policy namespace
		if workloadNamespace == "" {
			workloadNamespace = namespace
		}

		// Convert kind to resource (plural)
		if kind != "" {
			resource := strings.ToLower(kind)
			if !strings.HasSuffix(resource, "s") {
				resource += "s"
			}

			// Store the API group and resource for downsync rules
			apiGroups[apiGroup] = true
			resources[resource] = true

			// If specific workload name is available, store it
			if workloadName != "" {
				specificWorkloads = append(specificWorkloads, WorkloadInfo{
					APIVersion: fmt.Sprintf("%s/v1", apiGroup),
					Kind:       kind,
					Name:       workloadName,
					Namespace:  workloadNamespace,
				})
			}
		}
	}

	// Add workload IDs to annotations
	metadata := policyObj["metadata"].(map[string]interface{})
	annotations := metadata["annotations"].(map[string]string)
	annotations["workload-ids"] = strings.TrimSuffix(workloadAnnotations, ",")

	// Create downsync rules from collected API groups and resources
	downsyncRules := []interface{}{}

	// Create a mapping of namespaces used by workloads
	namespacesToResources := make(map[string][]string)

	// Group resources by namespace
	for _, workload := range specificWorkloads {
		// Get the current resources for this namespace
		resources, ok := namespacesToResources[workload.Namespace]
		if !ok {
			resources = []string{}
		}

		// Add the resource if not already there
		resource := strings.ToLower(workload.Kind)
		if !strings.HasSuffix(resource, "s") {
			resource += "s"
		}

		if !contains(resources, resource) {
			resources = append(resources, resource)
		}

		namespacesToResources[workload.Namespace] = resources
	}

	// If no specific workloads with namespaces, use the binding policy namespace
	if len(namespacesToResources) == 0 {
		for apiGroup := range apiGroups {
			resourcesForGroup := []string{}
			for resource := range resources {
				resourcesForGroup = append(resourcesForGroup, resource)
			}

			downsyncRules = append(downsyncRules, map[string]interface{}{
				"apiGroup":   apiGroup,
				"resources":  resourcesForGroup,
				"namespaces": []string{namespace},
			})
		}
	} else {
		// Create downsync rules for each namespace
		for ns, resourceList := range namespacesToResources {
			for apiGroup := range apiGroups {
				downsyncRules = append(downsyncRules, map[string]interface{}{
					"apiGroup":   apiGroup,
					"resources":  resourceList,
					"namespaces": []string{ns},
				})
			}
		}
	}

	policyObj["spec"].(map[string]interface{})["downsync"] = downsyncRules

	// Add specific workloads section if needed
	if len(specificWorkloads) > 0 {
		workloadsSection := []interface{}{}
		for _, workload := range specificWorkloads {
			workloadObj := map[string]interface{}{
				"apiVersion": workload.APIVersion,
				"kind":       workload.Kind,
				"metadata": map[string]interface{}{
					"name":      workload.Name,
					"namespace": workload.Namespace,
				},
			}
			workloadsSection = append(workloadsSection, workloadObj)
		}
		policyObj["spec"].(map[string]interface{})["workloads"] = workloadsSection

		// Also store the workload info in annotations for proper binding object creation
		workloadAnnotation := ""
		for _, workload := range specificWorkloads {
			if workloadAnnotation != "" {
				workloadAnnotation += ","
			}
			workloadAnnotation += fmt.Sprintf("%s,%s,%s,%s",
				workload.APIVersion,
				workload.Kind,
				workload.Name,
				workload.Namespace)
		}

		metadata := policyObj["metadata"].(map[string]interface{})
		annotations := metadata["annotations"].(map[string]string)
		annotations["specificWorkloads"] = workloadAnnotation
	}

	// Add the namespace as a cluster-scoped resource
	if len(specificWorkloads) > 0 {
		// First find all unique namespaces used by workloads
		uniqueNamespaces := make(map[string]bool)
		for _, workload := range specificWorkloads {
			if workload.Namespace != "" {
				uniqueNamespaces[workload.Namespace] = true
			}
		}

		// Add each namespace as a cluster-scoped resource
		for ns := range uniqueNamespaces {
			// Check if we need to add the namespace to workloadsSection
			namespaceObj := map[string]interface{}{
				"apiVersion": "v1",
				"kind":       "Namespace",
				"metadata": map[string]interface{}{
					"name": ns,
				},
			}

			if workloadsSection, ok := policyObj["spec"].(map[string]interface{})["workloads"].([]interface{}); ok {
				policyObj["spec"].(map[string]interface{})["workloads"] = append(workloadsSection, namespaceObj)
			}

			// Also ensure we have a downsync rule that includes namespaces
			namespaceDownsync := map[string]interface{}{
				"apiGroup":    "", // Empty for core API group
				"resources":   []string{"namespaces"},
				"objectNames": []string{ns},
			}

			// Add to downsync rules
			downsyncRules = append(downsyncRules, namespaceDownsync)
		}
	}

	// Update the downsync rules in the policy
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

	// Generate formatted YAML
	yamlData, err = yaml.Marshal(policyObj)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to format YAML: %s", err.Error())})
		return
	}

	// Create a BindingPolicy object from the YAML
	newBP := &v1alpha1.BindingPolicy{}
	if err := yaml.Unmarshal(yamlData, newBP); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to parse generated YAML: %s", err.Error())})
		return
	}

	// Ensure specific workloads are properly represented in the DownsyncPolicyClause
	if len(specificWorkloads) > 0 {
		for _, workload := range specificWorkloads {
			resourceName := strings.ToLower(workload.Kind)
			if !strings.HasSuffix(resourceName, "s") {
				resourceName += "s"
			}

			apiGroup := strings.Split(workload.APIVersion, "/")[0]

			// Find if we have a downsync rule that matches this workload's API group and resource
			found := false
			for i := range newBP.Spec.Downsync {
				currentApiGroup := "core"
				if newBP.Spec.Downsync[i].APIGroup != nil {
					currentApiGroup = *newBP.Spec.Downsync[i].APIGroup
				}

				if currentApiGroup == apiGroup &&
					contains(newBP.Spec.Downsync[i].Resources, resourceName) &&
					contains(newBP.Spec.Downsync[i].Namespaces, workload.Namespace) {
					if !contains(newBP.Spec.Downsync[i].ObjectNames, workload.Name) {
						newBP.Spec.Downsync[i].ObjectNames = append(newBP.Spec.Downsync[i].ObjectNames, workload.Name)
					}
					newBP.Spec.Downsync[i].WantSingletonReportedState = true

					found = true
					break
				}
			}

			// If no matching rule was found, create a new one
			if !found {
				newApiGroup := apiGroup
				newDownsync := v1alpha1.DownsyncPolicyClause{
					DownsyncObjectTest: v1alpha1.DownsyncObjectTest{
						APIGroup:    &newApiGroup,
						Resources:   []string{resourceName},
						Namespaces:  []string{workload.Namespace},
						ObjectNames: []string{workload.Name},
					},
					DownsyncModulation: v1alpha1.DownsyncModulation{
						WantSingletonReportedState: true,
					},
				}
				newBP.Spec.Downsync = append(newBP.Spec.Downsync, newDownsync)
			}
		}
	} else {
		fmt.Printf("Debug - No specific workloads found, creating generic downsync rules\n")

		// Apply to all resources in all namespaces if no specific rules
		if len(newBP.Spec.Downsync) == 0 {
			for apiGroup := range apiGroups {
				var resourceList []string
				for resource := range resources {
					resourceList = append(resourceList, resource)
				}

				if len(resourceList) > 0 {
					coreGroup := apiGroup
					newDownsync := v1alpha1.DownsyncPolicyClause{
						DownsyncObjectTest: v1alpha1.DownsyncObjectTest{
							APIGroup:   &coreGroup,
							Resources:  resourceList,
							Namespaces: []string{namespace},
						},
						DownsyncModulation: v1alpha1.DownsyncModulation{
							WantSingletonReportedState: true,
						},
					}
					newBP.Spec.Downsync = append(newBP.Spec.Downsync, newDownsync)
				}
			}
		}
	}

	// Validate and clean up cluster selectors to ensure WECs are properly matched
	if len(newBP.Spec.ClusterSelectors) == 0 {
		fmt.Printf("Debug - No cluster selectors found, adding default ones\n")
		for _, clusterId := range request.ClusterIds {
			labelSelector := metav1.LabelSelector{
				MatchLabels: map[string]string{
					"kubernetes.io/cluster-name": clusterId,
				},
			}
			newBP.Spec.ClusterSelectors = append(newBP.Spec.ClusterSelectors, labelSelector)
		}
	}

	// Ensure the correct namespace is set throughout the binding policy
	ensureCorrectNamespace(newBP, namespace)
	fmt.Printf("Debug - Ensured correct namespace '%s' is set in binding policy\n", namespace)

	// Re-marshal the updated binding policy
	updatedYamlData, err := yaml.Marshal(newBP)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to format updated YAML: %s", err.Error())})
		return
	}

	wecStatusInfo := []string{}

	// Check WEC cluster registration status
	for _, clusterId := range request.ClusterIds {
		cmd := exec.Command("kubectl", "--context", clusterId, "get", "nodes", "--show-labels")
		output, err := cmd.CombinedOutput()
		if err != nil {
			wecStatusInfo = append(wecStatusInfo, fmt.Sprintf("Warning: Could not access cluster %s", clusterId))
		} else if !strings.Contains(string(output), "kubernetes.io/cluster-name="+clusterId) {
			wecStatusInfo = append(wecStatusInfo, fmt.Sprintf("Note: Cluster %s needs label kubernetes.io/cluster-name=%s",
				clusterId, clusterId))
		} else {
			wecStatusInfo = append(wecStatusInfo, fmt.Sprintf("Cluster %s is properly labeled", clusterId))
		}
	}

	cmd := exec.Command("kubectl", "get", "pods", "-n", "kubestellar-system", "-l", "app=kubestellar-controller")
	output, err := cmd.CombinedOutput()
	if err != nil || !strings.Contains(string(output), "Running") {
		wecStatusInfo = append(wecStatusInfo, "KubeStellar controller not detected - workloads will need to be manually deployed")
	} else {
		wecStatusInfo = append(wecStatusInfo, "KubeStellar controller is running")
	}

	// Return the BindingPolicy object and YAML
	ctx.JSON(http.StatusOK, gin.H{
		"bindingPolicy": gin.H{
			"name":           policyName,
			"namespace":      namespace,
			"clusterIds":     request.ClusterIds,
			"workloadIds":    request.WorkloadIds,
			"status":         "inactive",
			"bindingMode":    "Downsync",
			"clusters":       request.ClusterIds,
			"workloads":      request.WorkloadIds,
			"clustersCount":  len(request.ClusterIds),
			"workloadsCount": len(request.WorkloadIds),
		},
		"wecStatus": wecStatusInfo,
		"yaml":      string(updatedYamlData),
	})
}

// sanitizeEmbeddedYaml ensures the embedded YAML in annotations is properly handled
func sanitizeEmbeddedYaml(yamlStr string, namespace string) string {
	if strings.HasPrefix(yamlStr, "|\n") || strings.HasPrefix(yamlStr, "> ") {
		// Extract the actual content
		lines := strings.Split(yamlStr, "\n")
		if len(lines) > 1 {
			actualYaml := strings.Join(lines[1:], "\n")

			// Parse the actual YAML
			var yamlObj map[string]interface{}
			if err := yaml.Unmarshal([]byte(actualYaml), &yamlObj); err == nil {
				// Update namespace in metadata
				if metadata, ok := yamlObj["objectmeta"].(map[string]interface{}); ok {
					metadata["namespace"] = namespace
				}

				// Marshal back to YAML
				if updatedYaml, err := yaml.Marshal(yamlObj); err == nil {
					// Reapply the block scalar style
					return "|\n" + string(updatedYaml)
				}
			}
		}
	}

	// For normal YAML strings, just parse and update directly
	var yamlObj map[string]interface{}
	if err := yaml.Unmarshal([]byte(yamlStr), &yamlObj); err == nil {
		// Update namespace in metadata
		if metadata, ok := yamlObj["objectmeta"].(map[string]interface{}); ok {
			metadata["namespace"] = namespace
		}

		// Marshal back to YAML
		if updatedYaml, err := yaml.Marshal(yamlObj); err == nil {
			return string(updatedYaml)
		}
	}
	return yamlStr
}

// Add a new function to ensure WEC clusters are properly registered
func ensureWECClusterLabels(clusterIds []string) error {
	// Check each target cluster context and ensure it has the proper labels
	for _, clusterId := range clusterIds {
		fmt.Printf("Debug - Ensuring cluster %s has proper labels\n", clusterId)
		_, err := exec.LookPath("kubectl")
		if err != nil {
			return fmt.Errorf("kubectl command not found: %v", err)
		}

		// Try to directly label nodes in the target cluster
		cmd := exec.Command("kubectl", "--context", clusterId, "label", "node", "--all",
			"kubernetes.io/cluster-name="+clusterId, "--overwrite")
		output, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Printf("Warning - Unable to label nodes in cluster %s: %v\n%s\n",
				clusterId, err, string(output))
		} else {
			fmt.Printf("Debug - Successfully labeled nodes in cluster %s\n", clusterId)
		}

		// Create the target namespace in the WEC if it doesn't exist
		cmd = exec.Command("kubectl", "--context", clusterId, "create", "namespace",
			"nginx", "--dry-run=client", "-o", "yaml")
		output, err = cmd.CombinedOutput()
		if err != nil {
			fmt.Printf("Warning - Unable to create namespace manifest in cluster %s: %v\n%s\n",
				clusterId, err, string(output))
		} else {
			applyCmd := exec.Command("kubectl", "--context", clusterId, "apply", "-f", "-")
			applyCmd.Stdin = bytes.NewReader(output)
			applyOutput, applyErr := applyCmd.CombinedOutput()
			if applyErr != nil {
				fmt.Printf("Warning - Unable to apply namespace in cluster %s: %v\n%s\n",
					clusterId, applyErr, string(applyOutput))
			} else {
				fmt.Printf("Debug - Ensured namespace exists in cluster %s\n", clusterId)
			}
		}
	}

	return nil
}

// ensureNamespaceExists checks if a namespace exists in the target cluster and creates it if not
func ensureNamespaceExists(clusterId, namespace string) error {
	// Skip for default namespace
	if namespace == "default" {
		return nil
	}

	// Get client for the cluster
	clientset, err := getK8sClientForContext(clusterId)
	if err != nil {
		return fmt.Errorf("failed to get client for cluster %s: %v", clusterId, err)
	}

	// Create namespace object
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	// Try to create the namespace
	_, err = clientset.CoreV1().Namespaces().Create(context.TODO(), ns, metav1.CreateOptions{})
	if err != nil {
		// If the namespace already exists, that's fine
		if errors.IsAlreadyExists(err) {
			fmt.Printf("Debug - Namespace %s already exists in cluster %s\n", namespace, clusterId)
			return nil
		}
		return fmt.Errorf("error creating namespace %s in cluster %s: %v", namespace, clusterId, err)
	}

	fmt.Printf("Debug - Created namespace %s in cluster %s\n", namespace, clusterId)
	return nil
}

// deployWorkloadToWEC deploys a workload to target WEC clusters using client-go
func deployWorkloadToWEC(workload WorkloadInfo, clusterIds []string) error {
	fmt.Printf("Debug - Deploying workload %s/%s directly to %d clusters\n",
		workload.Namespace, workload.Name, len(clusterIds))
	// Get workload manifest from source cluster
	cmd := exec.Command("kubectl", "get", strings.ToLower(workload.Kind),
		workload.Name, "-n", workload.Namespace, "-o", "json")
	sourceManifest, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("error getting workload manifest: %v\n%s", err, string(sourceManifest))
	}

	// Remove cluster-specific metadata fields from JSON before applying
	var jsonObj map[string]interface{}
	if err := json.Unmarshal(sourceManifest, &jsonObj); err != nil {
		return fmt.Errorf("error parsing source manifest: %v", err)
	}

	// Clean up metadata to make the object portable between clusters
	if metadata, ok := jsonObj["metadata"].(map[string]interface{}); ok {
		// Remove fields that should be generated by the target cluster
		delete(metadata, "uid")
		delete(metadata, "resourceVersion")
		delete(metadata, "creationTimestamp")
		delete(metadata, "generation")

		// Remove last-applied-configuration annotation if present
		if annotations, ok := metadata["annotations"].(map[string]interface{}); ok {
			delete(annotations, "kubectl.kubernetes.io/last-applied-configuration")
		}
	}

	// Remove status which should not be copied
	delete(jsonObj, "status")

	// Marshal back to JSON
	cleanJSON, err := json.Marshal(jsonObj)
	if err != nil {
		return fmt.Errorf("error creating clean manifest: %v", err)
	}

	// Apply the manifest to each target cluster
	for _, clusterId := range clusterIds {
		// First ensure the namespace exists
		if err := ensureNamespaceExists(clusterId, workload.Namespace); err != nil {
			fmt.Printf("Warning - %v\n", err)
		}

		clientset, err := getK8sClientForContext(clusterId)
		if err != nil {
			fmt.Printf("Warning - Failed to get client for cluster %s: %v\n", clusterId, err)
			continue
		}

		// Deploy the workload based on its kind
		switch strings.ToLower(workload.Kind) {
		case "deployment":
			// Create a deployment spec from the source
			var deployment appsv1.Deployment
			if err := json.Unmarshal(cleanJSON, &deployment); err != nil {
				fmt.Printf("Warning - Error parsing deployment: %v\n", err)
				continue
			}

			// Apply to target cluster
			_, err = clientset.AppsV1().Deployments(workload.Namespace).
				Create(context.TODO(), &deployment, metav1.CreateOptions{})
			if err != nil {
				if errors.IsAlreadyExists(err) {
					_, err = clientset.AppsV1().Deployments(workload.Namespace).
						Update(context.TODO(), &deployment, metav1.UpdateOptions{})
					if err != nil {
						fmt.Printf("Warning - Error updating deployment in cluster %s: %v\n", clusterId, err)
						continue
					}
				} else {
					fmt.Printf("Warning - Error creating deployment in cluster %s: %v\n", clusterId, err)
					continue
				}
			}

		case "service":
			// Create a service spec from the source
			var service corev1.Service
			if err := json.Unmarshal(cleanJSON, &service); err != nil {
				fmt.Printf("Warning - Error parsing service: %v\n", err)
				continue
			}

			// Apply to target cluster
			_, err = clientset.CoreV1().Services(workload.Namespace).
				Create(context.TODO(), &service, metav1.CreateOptions{})
			if err != nil {
				if errors.IsAlreadyExists(err) {
					_, err = clientset.CoreV1().Services(workload.Namespace).
						Update(context.TODO(), &service, metav1.UpdateOptions{})
					if err != nil {
						fmt.Printf("Warning - Error updating service in cluster %s: %v\n", clusterId, err)
						continue
					}
				} else {
					fmt.Printf("Warning - Error creating service in cluster %s: %v\n", clusterId, err)
					continue
				}
			}

		default:
			// For other resource types, fall back to kubectl because implementing every resource type
			fmt.Printf("Note - Using kubectl for resource type %s as it's not directly supported\n", workload.Kind)
			applyCmd := exec.Command("kubectl", "--context", clusterId, "apply", "-f", "-")
			applyCmd.Stdin = bytes.NewReader(cleanJSON)
			applyOutput, applyErr := applyCmd.CombinedOutput()
			if applyErr != nil {
				fmt.Printf("Warning - Error applying %s to cluster %s: %v\n%s\n",
					workload.Kind, clusterId, applyErr, string(applyOutput))
				continue
			}
		}

		fmt.Printf("Debug - Successfully applied %s to cluster %s\n", workload.Kind, clusterId)
	}

	return nil
}

// CheckWorkloadSyncStatus checks if a workload has been successfully synced to the specified WECs
func CheckWorkloadSyncStatus(workload WorkloadInfo, clusterIds []string) map[string]string {
	results := make(map[string]string)

	// Check each target cluster
	for _, clusterId := range clusterIds {
		// Get client for the cluster
		clientset, err := getK8sClientForContext(clusterId)
		if err != nil {
			results[clusterId] = fmt.Sprintf("Error: failed to connect to cluster: %v", err)
			continue
		}

		// Check if the workload exists based on its kind
		switch strings.ToLower(workload.Kind) {
		case "deployment":
			// Get deployment
			deployment, err := clientset.AppsV1().Deployments(workload.Namespace).
				Get(context.TODO(), workload.Name, metav1.GetOptions{})

			if err != nil {
				if errors.IsNotFound(err) {
					results[clusterId] = "NotSynced"
				} else {
					results[clusterId] = fmt.Sprintf("Error: %v", err)
				}
				continue
			}

			// Check if deployment is ready
			if deployment.Status.AvailableReplicas > 0 {
				results[clusterId] = "SyncedAndReady"
			} else {
				results[clusterId] = "SyncedButNotReady"
			}

		case "statefulset":
			// Get statefulset
			statefulset, err := clientset.AppsV1().StatefulSets(workload.Namespace).
				Get(context.TODO(), workload.Name, metav1.GetOptions{})

			if err != nil {
				if errors.IsNotFound(err) {
					results[clusterId] = "NotSynced"
				} else {
					results[clusterId] = fmt.Sprintf("Error: %v", err)
				}
				continue
			}

			// Check if statefulset is ready
			if statefulset.Status.ReadyReplicas > 0 {
				results[clusterId] = "SyncedAndReady"
			} else {
				results[clusterId] = "SyncedButNotReady"
			}

		case "daemonset":
			// Get daemonset
			daemonset, err := clientset.AppsV1().DaemonSets(workload.Namespace).
				Get(context.TODO(), workload.Name, metav1.GetOptions{})

			if err != nil {
				if errors.IsNotFound(err) {
					results[clusterId] = "NotSynced"
				} else {
					results[clusterId] = fmt.Sprintf("Error: %v", err)
				}
				continue
			}

			// Check if daemonset is ready
			if daemonset.Status.NumberReady > 0 {
				results[clusterId] = "SyncedAndReady"
			} else {
				results[clusterId] = "SyncedButNotReady"
			}

		case "service":
			// Just check if service exists
			_, err := clientset.CoreV1().Services(workload.Namespace).
				Get(context.TODO(), workload.Name, metav1.GetOptions{})

			if err != nil {
				if errors.IsNotFound(err) {
					results[clusterId] = "NotSynced"
				} else {
					results[clusterId] = fmt.Sprintf("Error: %v", err)
				}
			} else {
				results[clusterId] = "SyncedAndReady" // Services are always "ready" if they exist
			}

		default:
			results[clusterId] = fmt.Sprintf("Warning: Resource type %s checking not implemented", workload.Kind)
		}
	}

	return results
}

func GetWorkloadSyncStatus(ctx *gin.Context) {
	// Extract request parameters
	workloadId := ctx.Query("workloadId")
	clusterIdsParam := ctx.Query("clusterIds")

	if workloadId == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "workloadId parameter is required"})
		return
	}

	// Parse the workload identifier
	apiGroup, kind, name, namespace := parseWorkloadIdentifier(workloadId)
	if namespace == "" {
		namespace = "default"
	}

	workload := WorkloadInfo{
		APIVersion: apiGroup + "/v1",
		Kind:       kind,
		Name:       name,
		Namespace:  namespace,
	}

	// Parse the cluster IDs
	var clusterIds []string
	if clusterIdsParam != "" {
		clusterIds = strings.Split(clusterIdsParam, ",")
	} else {
		// Default to known contexts
		wec1Context := os.Getenv("wec1_context")
		wec2Context := os.Getenv("wec2_context")

		if wec1Context != "" {
			clusterIds = append(clusterIds, wec1Context)
		}
		if wec2Context != "" {
			clusterIds = append(clusterIds, wec2Context)
		}

		// If still no contexts, try some defaults
		if len(clusterIds) == 0 {
			clusterIds = []string{"cluster1", "cluster2"}
		}
	}

	// Check the sync status
	syncStatus := CheckWorkloadSyncStatus(workload, clusterIds)

	// Return the results
	ctx.JSON(http.StatusOK, gin.H{
		"workload":   workload,
		"syncStatus": syncStatus,
	})
}

func getK8sClientForContext(contextName string) (*kubernetes.Clientset, error) {
	// Load kubeconfig from default location
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{
		CurrentContext: contextName,
	}

	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	config, err := kubeConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get client config for context %s: %v", contextName, err)
	}

	// Create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset for context %s: %v", contextName, err)
	}

	return clientset, nil
}
