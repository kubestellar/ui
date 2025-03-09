package bp

import (
	"fmt"
	"os"
	"path/filepath"

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
	log.LogDebug("", zap.String("kubeconfig patha: ", kubeconfig))

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
