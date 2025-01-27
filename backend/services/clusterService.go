package services

import (
	"context"
	"fmt"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

)

func GetClusterNameFromKubeconfig(data []byte) (string, error) {
	config, err := clientcmd.Load(data)
	if err != nil {
		return "", fmt.Errorf("invalid kubeconfig: %w", err)
	}

	if config.CurrentContext == "" {
		return "", fmt.Errorf("kubeconfig does not specify a current context")
	}

	context := config.Contexts[config.CurrentContext]
	if context == nil || context.Cluster == "" {
		return "", fmt.Errorf("invalid kubeconfig: cluster information missing")
	}

	return context.Cluster, nil
}

func ValidateClusterConnectivity(kubeconfigData []byte) error {
	// Load REST config from kubeconfig
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
	if err != nil {
		return fmt.Errorf("failed to parse kubeconfig: %w", err)
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	// Test connectivity by listing nodes
	_, err = client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to connect to the cluster: %w", err)
	}

	return nil
}
