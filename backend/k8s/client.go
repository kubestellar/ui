package k8s

import (
	"fmt"

	"github.com/katamyra/kubestellarUI/wds"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func GetClientSet() (*kubernetes.Clientset, dynamic.Interface, error) {
	// Get Kubernetes clientset
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get Kubernetes clientset: %v", err)
	}

	// Manually load kubeconfig to get *rest.Config
	kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Create dynamic client using the same rest.Config
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	return clientset, dynamicClient, nil
}
