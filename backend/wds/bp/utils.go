package bp

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/katamyra/kubestellarUI/log"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	bpv1alpha1 "github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/typed/control/v1alpha1"
	"go.uber.org/zap"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// Utility functions for Handlers

// getClientForBp creates a new client for BindingPolicy operations
func getClientForBp() (*bpv1alpha1.ControlV1alpha1Client, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	log.LogDebug("creating client For BP")
	log.LogDebug("", zap.String("kubeconfig path: ", kubeconfig))

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.String("err", err.Error()))
		return nil, err
	}

	wds_ctx := os.Getenv("wds_context")
	if wds_ctx == "" {
		return nil, fmt.Errorf("env var wds_context not set")
	}
	log.LogDebug("", zap.String("wds_contex: ", wds_ctx))

	overrides := &clientcmd.ConfigOverrides{
		CurrentContext: wds_ctx,
	}
	cconfig := clientcmd.NewDefaultClientConfig(*config, overrides)

	restcnfg, err := cconfig.ClientConfig()
	if err != nil {
		log.LogError("failed to get rest config", zap.String("error", err.Error()))
		return nil, err
	}

	c, err := bpv1alpha1.NewForConfig(restcnfg)
	if err != nil {
		log.LogError("failed to create bp client", zap.String("error", err.Error()))
		return nil, err
	}

	return c, nil
}

// extractWorkloads gets a list of workloads affected by this BP
// Update the extractWorkloads function in the second file (paste-2.txt)
// This function is responsible for getting workloads from binding policies

// extractWorkloads gets a list of workloads affected by this BP
// Now includes both downsync resources and specific workloads
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

	// Note: We've removed the section that tried to access bp.Spec.Workloads
	// since that field doesn't exist in the KubeStellar API

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
