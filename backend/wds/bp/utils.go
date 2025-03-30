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

	// Process downsync resources
	for _, ds := range bp.Spec.Downsync {
		apiGroupValue := "core" // Default to core
		if ds.APIGroup != nil && *ds.APIGroup != "" {
			apiGroupValue = *ds.APIGroup
		}

		fmt.Printf("Debug - extractWorkloads - Found APIGroup: %s, Resources: %v, Namespaces: %v\n",
			apiGroupValue, ds.Resources, ds.Namespaces)

		// Add each resource with its API group
		for _, resource := range ds.Resources {
			// Convert resource to lowercase for consistent handling
			resourceLower := strings.ToLower(resource)

			// Format as apiGroup/resource
			workloadType := fmt.Sprintf("%s/%s", apiGroupValue, resourceLower)

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
