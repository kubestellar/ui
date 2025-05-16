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
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
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
		log.LogDebug("extractWorkloads - BP is nil")
		return workloads
	}

	log.LogDebug("extractWorkloads - Processing downsync rules", zap.Int("downsyncCount", len(bp.Spec.Downsync)))

	// Load kubeconfig
	kubeconfigPath := clientcmd.RecommendedHomeFile

	// Load raw kubeconfig and select context "wds1"
	rawConfig, err := clientcmd.LoadFromFile(kubeconfigPath)
	if err != nil {
		log.LogError("failed to load kubeconfig file", zap.String("path", kubeconfigPath), zap.Error(err))
		return workloads // Return an empty list of workloads on failure
	}

	// Explicitly set context to "wds1"
	rawConfig.CurrentContext = "wds1"

	// Build config from modified rawConfig
	config, err := clientcmd.NewDefaultClientConfig(
		*rawConfig,
		&clientcmd.ConfigOverrides{CurrentContext: "wds1"},
	).ClientConfig()
	if err != nil {
		log.LogError("failed to load kubeconfig for context 'wds1'", zap.Error(err))
		return workloads // Return an empty list of workloads on failure
	}

	// Create dynamic client
	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		log.LogError("failed to create dynamic client", zap.Error(err))
		return workloads // Return an empty list of workloads on failure
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
		log.LogError("failed to list bindings", zap.Error(err))
		return workloads // Return an empty list of workloads on failure
	}

	var results []string

	for _, binding := range bindings.Items {
		if bp.Name != binding.GetName() {
			continue
		}
		// Extract .spec.workload
		workload, found, err := unstructured.NestedMap(binding.Object, "spec", "workload")
		if err != nil || !found {
			log.LogDebug("extractWorkloads - no workload found in binding", zap.String("binding", binding.GetName()))
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

	log.LogInfo("extractWorkloads - extracted workloads",
		zap.Int("count", len(workloads)), zap.Strings("workloads", workloads))
	return workloads
}

// extractTargetClusters extracts the list of target clusters from ClusterSelectors
func extractTargetClusters(bp *v1alpha1.BindingPolicy) []string {
	clusters := []string{}

	// Safety check
	if bp == nil {
		log.LogWarn("extractTargetClusters - BP is nil")
		return clusters
	}

	if len(bp.Spec.ClusterSelectors) == 0 {
		log.LogInfo("extractTargetClusters - No ClusterSelectors found")
		return clusters
	}

	log.LogDebug("extractTargetClusters - processing ClusterSelectors", zap.Int("count", len(bp.Spec.ClusterSelectors)))

	// Iterate through each cluster selector
	for i, selector := range bp.Spec.ClusterSelectors {
		log.LogDebug("extractTargetClusters - Processing selector", zap.Int("index", i))

		// Check if MatchLabels is nil
		if selector.MatchLabels == nil {
			log.LogDebug("extractTargetClusters - MatchLabels is nil for selector", zap.Int("index", i))
			continue
		}

		// Debug all labels in this selector
		for k, v := range selector.MatchLabels {
			log.LogDebug("extractTargetClusters - found label",
				zap.String("key", k), zap.String("value", v))

			// Check specifically for kubernetes.io/cluster-name label
			if k == "kubernetes.io/cluster-name" {
				log.LogInfo("extractTargetClusters - found cluster name", zap.String("cluster", v))
				clusters = append(clusters, v)
			}
		}
	}

	// If no clusters found using the selector labels, try general labels
	if len(clusters) == 0 {
		log.LogDebug("extractTargetClusters - no clusters found via kubernetes.io/cluster-name, checking all labels")
		for i, selector := range bp.Spec.ClusterSelectors {
			if selector.MatchLabels != nil {
				for k, v := range selector.MatchLabels {
					// Add any label that might identify a cluster
					clusters = append(clusters, fmt.Sprintf("%s:%s", k, v))
					log.LogDebug("extractTargetClusters - added generic label", zap.Int("selectorIndex", i),
						zap.String("labelKey", k), zap.String("labelValue", v))
				}
			}
		}
	}

	log.LogInfo("ectractTargetCLusters - returning clusters", zap.Int("count", len(clusters)), zap.Strings("clusters", clusters))
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
