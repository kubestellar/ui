package ns

import (
	"context"
	"fmt"
	"time"

	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/wds"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// timeout duration for Kubernetes API requests
const requestTimeout = 5 * time.Second

// CreateNamespace creates a new namespace
func CreateNamespace(namespace models.Namespace) error {
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	// Create namespace with optional labels
	_, err = clientset.CoreV1().Namespaces().Create(ctx, &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   namespace.Name,
			Labels: namespace.Labels,
		},
	}, metav1.CreateOptions{})

	if err != nil {
		return fmt.Errorf("failed to create namespace: %v", err)
	}
	return nil
}

// GetAllNamespaces fetches all namespaces along with their pods
func GetAllNamespaces() ([]models.Namespace, error) {
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	namespaces, err := clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list namespaces: %v", err)
	}

	var namespaceDetails []models.Namespace
	for _, ns := range namespaces.Items {
		pods, _ := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{})

		var podNames []string
		for _, pod := range pods.Items {
			podNames = append(podNames, pod.Name)
		}

		namespaceDetails = append(namespaceDetails, models.Namespace{
			Name:   ns.Name,
			Status: string(ns.Status.Phase),
			Pods:   podNames,
		})
	}

	return namespaceDetails, nil
}

// GetNamespaceDetails fetches details of a specific namespace
func GetNamespaceDetails(namespace string) (*models.Namespace, error) {
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	if err != nil {
		return nil, fmt.Errorf("namespace '%s' not found: %v", namespace, err)
	}

	details := &models.Namespace{
		Name:   ns.Name,
		Status: string(ns.Status.Phase),
		Labels: ns.Labels,
	}

	return details, nil
}

// UpdateNamespace updates namespace labels
func UpdateNamespace(namespaceName string, labels map[string]string) error {
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	ns, err := clientset.CoreV1().Namespaces().Get(ctx, namespaceName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("namespace '%s' not found", namespaceName)
	}

	ns.Labels = labels
	_, err = clientset.CoreV1().Namespaces().Update(ctx, ns, metav1.UpdateOptions{})
	if err != nil {
		return fmt.Errorf("failed to update namespace: %v", err)
	}

	return nil
}

// DeleteNamespace removes a namespace
func DeleteNamespace(name string) error {
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		return fmt.Errorf("failed to initialize Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), requestTimeout)
	defer cancel()

	err = clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete namespace '%s': %v", name, err)
	}
	return nil
}
