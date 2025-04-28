package bp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/scheme"
	bpv1alpha1 "github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/typed/control/v1alpha1"
	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/redis"
	"go.uber.org/zap"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// DefaultWDSContext is the default context to use for the workload distribution service
const DefaultWDSContext = "wds1"

// clientCache caches the BP client to avoid recreating it for each request
var (
	clientCache     *bpv1alpha1.ControlV1alpha1Client
	clientCacheLock sync.Mutex
)

// getClientForBp creates a new client for BindingPolicy operations
func getClientForBp() (*bpv1alpha1.ControlV1alpha1Client, error) {
	clientCacheLock.Lock()
	defer clientCacheLock.Unlock()

	// Return cached client if available
	if clientCache != nil {
		return clientCache, nil
	}

	// Set wds context to "wds1"
	wdsContext := "wds1"
	log.LogDebug("Using wds context", zap.String("context", wdsContext))

	// Get kubeconfig path
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	log.LogDebug("Creating client for BP", zap.String("kubeconfig path", kubeconfig))

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.String("err", err.Error()))
		return nil, err
	}

	// Make sure the specified context exists
	if _, exists := config.Contexts[wdsContext]; !exists {
		// If the specified context doesn't exist, try to find any kubestellar or kubeflex context
		found := false
		for contextName := range config.Contexts {
			if containsAny(contextName, []string{"kubestellar", "kubeflex"}) {
				wdsContext = contextName
				found = true
				log.LogInfo("Using available kubestellar/kubeflex context", zap.String("context", wdsContext))
				break
			}
		}

		// If still not found, use the current context
		if !found && config.CurrentContext != "" {
			wdsContext = config.CurrentContext
			log.LogInfo("Using current context", zap.String("context", wdsContext))
		}

		// If we still don't have a valid context, return an error
		if _, exists := config.Contexts[wdsContext]; !exists {
			return nil, fmt.Errorf("no valid Kubernetes context found for KubeStellar operations")
		}
	}

	// Set config overrides with our determined context
	overrides := &clientcmd.ConfigOverrides{
		CurrentContext: wdsContext,
	}
	cconfig := clientcmd.NewDefaultClientConfig(*config, overrides)

	// Get REST config
	restcnfg, err := cconfig.ClientConfig()
	if err != nil {
		log.LogError("Failed to get rest config", zap.String("error", err.Error()))
		return nil, err
	}

	// Create client
	c, err := bpv1alpha1.NewForConfig(restcnfg)
	if err != nil {
		log.LogError("Failed to create bp client", zap.String("error", err.Error()))
		return nil, err
	}

	// Cache the client for future use
	clientCache = c

	return c, nil
}

// get BP struct from YAML
func getBpObjFromYaml(bpRawYamlBytes []byte) (*v1alpha1.BindingPolicy, error) {
	obj, _, err := scheme.Codecs.UniversalDeserializer().Decode(bpRawYamlBytes, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to detect object type: %v", err.Error())
	}
	bp, ok := obj.(*v1alpha1.BindingPolicy)
	if !ok {
		return nil, fmt.Errorf("wrong object type, yaml type not supported")
	}
	return bp, nil

}

// Helper function to check if a string contains any of the given substrings
func containsAny(s string, substrings []string) bool {
	for _, substr := range substrings {
		if strings.Contains(s, substr) {
			return true
		}
	}
	return false
}

// extractWorkloads gets a list of workloads affected by this BP
func extractWorkloads(bp *v1alpha1.BindingPolicy) []string {
	workloads := []string{}

	// Safety check
	if bp == nil {
		fmt.Printf("Debug - extractWorkloads - BP is nil\n")
		return workloads
	}

	fmt.Printf("Debug - extractWorkloads - Processing %d Downsync rules\n", len(bp.Spec.Downsync))

	// Load kubeconfig
	kubeconfigPath := clientcmd.RecommendedHomeFile

	// Load raw kubeconfig and select context "wds1"
	rawConfig, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		panic(fmt.Errorf("failed to load kubeconfig file: %v", err))
	}

	// Explicitly set context to "wds1"
	rawConfig.CurrentContext = "wds1"

	// Build config from modified rawConfig
	config, err := clientcmd.NewDefaultClientConfig(
		*rawConfig,
		&clientcmd.ConfigOverrides{CurrentContext: "wds1"},
	).ClientConfig()
	if err != nil {
		panic(fmt.Errorf("failed to load kubeconfig for context 'wds1': %v", err))
	}

	// Create dynamic client
	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		panic(fmt.Errorf("failed to create dynamic client: %v", err))
	}

	// Define GVR for the Binding CRD
	bindingGVR := schema.GroupVersionResource{
		Group:    "control.kubestellar.io",
		Version:  "v1alpha1",
		Resource: "bindings",
	}

	// List all Bindings across all namespaces
	bindings, err := dynClient.Resource(bindingGVR).List(context.TODO(), v1.ListOptions{})
	if err != nil {
		panic(fmt.Errorf("failed to list bindings: %v", err))
	}

	var results []string

	for _, binding := range bindings.Items {
		if bp.Name != binding.GetName() {
			continue
		}
		// Extract .spec.workload
		workload, found, err := unstructured.NestedMap(binding.Object, "spec", "workload")
		if err != nil || !found {
			continue
		}

		// Process clusterScope[]
		clusterScope, found, err := unstructured.NestedSlice(workload, "clusterScope")
		if err == nil && found {
			for _, item := range clusterScope {
				if obj, ok := item.(map[string]interface{}); ok {
					resource, _ := obj["resource"].(string)
					name, _ := obj["name"].(string)
					if resource != "" && name != "" {
						results = append(results, fmt.Sprintf("%s: %s", resource, name))
					}
				}
			}
		}

		// Process namespaceScope[]
		namespaceScope, found, err := unstructured.NestedSlice(workload, "namespaceScope")
		if err == nil && found {
			for _, item := range namespaceScope {
				if obj, ok := item.(map[string]interface{}); ok {
					resource, _ := obj["resource"].(string)
					name, _ := obj["name"].(string)
					if resource != "" && name != "" {
						results = append(results, fmt.Sprintf("%s: %s", resource, name))
					}
				}
			}
		}
	}

	workloads = results

	// Print as formatted JSON array
	// formatted, _ := json.MarshalIndent(results, "", "  ")
	// fmt.Println(string(formatted))

	fmt.Printf("Debug - extractWorkloads - Extracted %d workloads: %v\n", len(workloads), workloads)
	return workloads
}

// extractTargetClusters extracts the list of target clusters from ClusterSelectors
func extractTargetClusters(bp *v1alpha1.BindingPolicy) []string {
	clusters := []string{}

	// Safety check
	if bp == nil {
		fmt.Printf("Debug - extractTargetClusters - BP is nil\n")
		return clusters
	}

	if len(bp.Spec.ClusterSelectors) == 0 {
		fmt.Printf("Debug - extractTargetClusters - No ClusterSelectors found\n")
		return clusters
	}

	fmt.Printf("Debug - extractTargetClusters - Processing %d ClusterSelectors\n", len(bp.Spec.ClusterSelectors))

	// Iterate through each cluster selector
	for i, selector := range bp.Spec.ClusterSelectors {
		fmt.Printf("Debug - extractTargetClusters - Processing selector #%d\n", i)

		// Check if MatchLabels is nil
		if selector.MatchLabels == nil {
			fmt.Printf("Debug - extractTargetClusters - MatchLabels is nil for selector #%d\n", i)
			continue
		}

		// Debug all labels in this selector
		for k, v := range selector.MatchLabels {
			fmt.Printf("Debug - extractTargetClusters - Label %s=%s\n", k, v)

			// Check specifically for kubernetes.io/cluster-name label
			if k == "kubernetes.io/cluster-name" {
				fmt.Printf("Debug - extractTargetClusters - Found cluster name: %s\n", v)
				clusters = append(clusters, v)
			}
		}
	}

	// If no clusters found using the selector labels, try general labels
	if len(clusters) == 0 {
		fmt.Printf("Debug - extractTargetClusters - No clusters found via kubernetes.io/cluster-name, checking all labels\n")
		for i, selector := range bp.Spec.ClusterSelectors {
			if selector.MatchLabels != nil {
				for k, v := range selector.MatchLabels {
					// Add any label that might identify a cluster
					clusters = append(clusters, fmt.Sprintf("%s:%s", k, v))
					fmt.Printf("Debug - extractTargetClusters - Added generic label #%d: %s:%s\n", i, k, v)
				}
			}
		}
	}

	fmt.Printf("Debug - extractTargetClusters - Returning %d clusters: %v\n", len(clusters), clusters)
	return clusters
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

// check if content type is valid
func contentTypeValid(t string) bool {
	// Extract the base content type (ignore parameters like boundary=...)
	baseType := t
	if idx := strings.Index(t, ";"); idx != -1 {
		baseType = strings.TrimSpace(t[:idx])
	}

	supportedTypes := []string{"application/yaml", "multipart/form-data"}
	for _, v := range supportedTypes {
		if baseType == v {
			return true
		}
	}
	return false
}

// watches on all binding policy resources , PROTOTYPE just for now
func watchOnBps() {
	c, err := getClientForBp()
	if err != nil {
		log.LogError("failed to watch on BP", zap.String("error", err.Error()))
		return
	}

	for {

		w, err := c.BindingPolicies().Watch(context.TODO(), v1.ListOptions{})
		if err != nil {
			log.LogError("failed to watch on BP", zap.String("error", err.Error()))
			return
		}
		eventChan := w.ResultChan()
		for event := range eventChan {
			switch event.Type {
			case "MODIFIED":
				bp, _ := event.Object.(*v1alpha1.BindingPolicy)
				if bp.ObjectMeta.Generation == bp.Status.ObservedGeneration {
					log.LogInfo("reconciled successfully", zap.String("name", bp.Name))
				} else {
					log.LogInfo("reconciling...", zap.String("name", bp.Name))
				}
				log.LogInfo("BP modified: ", zap.String("name", bp.Name))

			case "ADDED":
				bp, _ := event.Object.(*v1alpha1.BindingPolicy)
				log.LogInfo("BP added: ", zap.String("name", bp.Name))

			case "DELETED":
				bp, _ := event.Object.(*v1alpha1.BindingPolicy)
				err := redis.DeleteBpcmd(bp.Name)
				if err != nil {
					log.LogError("Error deleting bp from redis", zap.String("error", err.Error()))
				}
				log.LogInfo("BP deleted: ", zap.String("name", bp.Name))
			case "ERROR":
				log.LogWarn("Some error occured while watching ON BP")
			}
		}

	}
}
func init() {

	go watchOnBps()
}

// CreateNamespaceInWEC creates a namespace in the WEC cluster with the same name as the namespace in the BP
func CreateNamespaceInWEC(bpNamespace string, wecContexts []string, clusterLabels []map[string]string) error {
	log.LogInfo("CreateNamespaceInWEC called",
		zap.String("namespace", bpNamespace),
		zap.Strings("wecContexts", wecContexts),
		zap.Any("clusterLabels", clusterLabels))

	if bpNamespace == "" || bpNamespace == "default" {
		log.LogInfo("Skipping namespace creation for default or empty namespace")
		return nil
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	log.LogInfo("Using kubeconfig", zap.String("path", kubeconfig))

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig for WEC", zap.String("err", err.Error()))
		return err
	}

	var availableContexts []string
	for contextName := range config.Contexts {
		availableContexts = append(availableContexts, contextName)
	}
	log.LogInfo("Available contexts", zap.Strings("contexts", availableContexts))

	finalContexts := []string{}

	for _, ctx := range wecContexts {
		if _, exists := config.Contexts[ctx]; exists {
			finalContexts = append(finalContexts, ctx)
			log.LogInfo("Added explicit context", zap.String("context", ctx))
		} else {
			log.LogWarn("Explicit context not found", zap.String("context", ctx))
		}
	}

	if len(finalContexts) == 0 {
		log.LogInfo("Starting auto-discovery of WEC contexts")

		for _, directCtx := range []string{"cluster1", "cluster2"} {
			if _, exists := config.Contexts[directCtx]; exists {
				finalContexts = append(finalContexts, directCtx)
				log.LogInfo("Using direct cluster context", zap.String("context", directCtx))
			}
		}

		if len(finalContexts) > 0 {
			log.LogInfo("Found direct cluster contexts, using them",
				zap.Strings("contexts", finalContexts))
			goto CreateNamespaces
		}

		if len(clusterLabels) > 0 {
			log.LogInfo("Trying to match cluster labels to contexts",
				zap.Any("clusterLabels", clusterLabels))

			for _, labelSet := range clusterLabels {
				if clusterName, ok := labelSet["kubernetes.io/cluster-name"]; ok {
					if _, exists := config.Contexts[clusterName]; exists {
						log.LogInfo("Found context from kubernetes.io/cluster-name label",
							zap.String("context", clusterName))
						finalContexts = append(finalContexts, clusterName)
					} else {
						log.LogInfo("Context from kubernetes.io/cluster-name not found",
							zap.String("context", clusterName))
					}
				}
			}

			for _, labelSet := range clusterLabels {
				if clusterName, ok := labelSet["name"]; ok {
					// Check if this context exists
					if _, exists := config.Contexts[clusterName]; exists {
						isDuplicate := false
						for _, ctx := range finalContexts {
							if ctx == clusterName {
								isDuplicate = true
								break
							}
						}
						if !isDuplicate {
							log.LogInfo("Found context from name label",
								zap.String("context", clusterName))
							finalContexts = append(finalContexts, clusterName)
						}
					}
				}
			}

			// If no contexts found yet, try looking for "cluster" prefixed contexts
			// including exact matches to label values
			if len(finalContexts) == 0 {
				log.LogInfo("No contexts found from specific labels, trying pattern matching")

				// First, extract potential cluster names from labels
				var potentialClusterNames []string
				for _, labelSet := range clusterLabels {
					for _, value := range labelSet {
						potentialClusterNames = append(potentialClusterNames, value)
					}
				}

				log.LogInfo("Potential cluster names from labels",
					zap.Strings("names", potentialClusterNames))

				// Now try to match with available contexts
				for contextName := range config.Contexts {
					// Skip WDS
					if contextName == "wds1" {
						continue
					}

					// Check for exact matches to label values
					for _, name := range potentialClusterNames {
						if contextName == name {
							log.LogInfo("Found direct match for context name",
								zap.String("context", contextName))
							finalContexts = append(finalContexts, contextName)
							break
						}
					}

					// Also check for cluster prefix
					if strings.HasPrefix(contextName, "cluster") && contextName != "wds1" {
						// Don't add duplicates
						isDuplicate := false
						for _, ctx := range finalContexts {
							if ctx == contextName {
								isDuplicate = true
								break
							}
						}
						if !isDuplicate {
							log.LogInfo("Found cluster context", zap.String("context", contextName))
							finalContexts = append(finalContexts, contextName)
						}
					}
				}
			}
		}

		// If still no contexts found, use the standard detection method
		if len(finalContexts) == 0 {
			log.LogInfo("No contexts found from labels, trying prefix-based detection")
			for contextName := range config.Contexts {
				// Accept contexts with standard WEC prefixes or explicit "cluster" prefix
				if strings.HasPrefix(contextName, "wec") ||
					strings.HasPrefix(contextName, "its") ||
					strings.HasPrefix(contextName, "cluster") {
					// Skip the WDS context
					if contextName == "wds1" {
						continue
					}
					// Don't add duplicates
					isDuplicate := false
					for _, ctx := range finalContexts {
						if ctx == contextName {
							isDuplicate = true
							break
						}
					}
					if !isDuplicate {
						finalContexts = append(finalContexts, contextName)
						log.LogInfo("Found potential WEC context", zap.String("context", contextName))
					}
				}
			}
		}
	}

CreateNamespaces:
	// If still no WEC contexts found, log warning and return
	if len(finalContexts) == 0 {
		log.LogWarn("No WEC contexts found, skipping namespace creation. Please specify contexts explicitly.")
		return nil
	}

	log.LogInfo("Creating namespace in WEC contexts",
		zap.String("namespace", bpNamespace),
		zap.Strings("contexts", finalContexts))

	// Create namespace in each WEC context
	for _, wecContext := range finalContexts {
		log.LogInfo("Processing context", zap.String("context", wecContext))

		// Set config overrides with WEC context
		overrides := &clientcmd.ConfigOverrides{
			CurrentContext: wecContext,
		}
		clientConfig := clientcmd.NewDefaultClientConfig(*config, overrides)

		// Get REST config
		restConfig, err := clientConfig.ClientConfig()
		if err != nil {
			log.LogError("Failed to get rest config for WEC",
				zap.String("context", wecContext),
				zap.String("error", err.Error()))
			continue
		}

		// Create client
		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			log.LogError("Failed to create kubernetes client for WEC",
				zap.String("context", wecContext),
				zap.String("error", err.Error()))
			continue
		}

		// Check if namespace already exists
		_, err = clientset.CoreV1().Namespaces().Get(context.TODO(), bpNamespace, v1.GetOptions{})
		if err == nil {
			log.LogInfo("Namespace already exists in WEC",
				zap.String("namespace", bpNamespace),
				zap.String("context", wecContext))
			continue
		} else {
			log.LogInfo("Namespace does not exist, will create",
				zap.String("namespace", bpNamespace),
				zap.String("context", wecContext),
				zap.String("error", err.Error()))
		}

		// Create namespace
		ns := &corev1.Namespace{
			ObjectMeta: v1.ObjectMeta{
				Name: bpNamespace,
				Labels: map[string]string{
					"kubernetes.io/kubestellar.workload.name": bpNamespace,
					"created-by": "kubestellar-ui",
				},
			},
		}

		createdNs, err := clientset.CoreV1().Namespaces().Create(context.TODO(), ns, v1.CreateOptions{})
		if err != nil {
			log.LogError("Failed to create namespace in WEC",
				zap.String("namespace", bpNamespace),
				zap.String("context", wecContext),
				zap.String("error", err.Error()))
			continue
		}

		log.LogInfo("Successfully created namespace in WEC",
			zap.String("namespace", createdNs.Name),
			zap.String("context", wecContext))
	}

	return nil
}
