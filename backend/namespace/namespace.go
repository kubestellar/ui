package ns

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/katamyra/kubestellarUI/models"
	"github.com/katamyra/kubestellarUI/redis"
	"github.com/katamyra/kubestellarUI/wds"
	appsv1 "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// timeout duration for Kubernetes API requests
const requestTimeout = 5 * time.Second

var upgrader = websocket.Upgrader{
	// CheckOrigin allows all cross-origin requests by always returning true.
	// This is a security setting for WebSocket connections that controls which domains can connect.
	// WARNING: Setting this to always return true is insecure for production environments
	// as it allows any origin to establish WebSocket connections.
	// @param r *http.Request - The incoming HTTP request
	// @return bool - Always returns true, allowing all origins
	CheckOrigin: func(_ *http.Request) bool { return true },
}

// GetAllNamespacesWithResources fetches all namespaces and their connected resources
type NamespaceDetails struct {
	Name        string              `json:"name"`
	Status      string              `json:"status"`
	Labels      map[string]string   `json:"labels"`
	Pods        []v1.Pod            `json:"pods"`
	Deployments []appsv1.Deployment `json:"deployments"`
	Services    []v1.Service        `json:"services"`
	ConfigMaps  []v1.ConfigMap      `json:"configmaps"`
	Secrets     []v1.Secret         `json:"secrets"`
}

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

// GetNamespaceDetails fetches detailed information about a specific namespace
func GetNamespaceDetails(namespace string) (*NamespaceDetails, error) {
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

	// Fetch all related resources
	pods, _ := clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	deployments, _ := clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	services, _ := clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	configMaps, _ := clientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
	secrets, _ := clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})

	details := &NamespaceDetails{
		Name:        ns.Name,
		Status:      string(ns.Status.Phase),
		Labels:      ns.Labels,
		Pods:        pods.Items,
		Deployments: deployments.Items,
		Services:    services.Items,
		ConfigMaps:  configMaps.Items,
		Secrets:     secrets.Items,
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

// GetAllNamespacesWithResources retrieves all namespaces along with their associated resources.
func GetAllNamespacesWithResources() ([]NamespaceDetails, error) {
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

	var namespaceDetails []NamespaceDetails

	for _, ns := range namespaces.Items {
		var details NamespaceDetails
		details.Name = ns.Name
		details.Status = string(ns.Status.Phase)
		details.Labels = ns.Labels

		pods, _ := clientset.CoreV1().Pods(ns.Name).List(ctx, metav1.ListOptions{})
		deployments, _ := clientset.AppsV1().Deployments(ns.Name).List(ctx, metav1.ListOptions{})
		services, _ := clientset.CoreV1().Services(ns.Name).List(ctx, metav1.ListOptions{})
		configMaps, _ := clientset.CoreV1().ConfigMaps(ns.Name).List(ctx, metav1.ListOptions{})
		secrets, _ := clientset.CoreV1().Secrets(ns.Name).List(ctx, metav1.ListOptions{})

		details.Pods = pods.Items
		details.Deployments = deployments.Items
		details.Services = services.Items
		details.ConfigMaps = configMaps.Items
		details.Secrets = secrets.Items

		namespaceDetails = append(namespaceDetails, details)
	}

	return namespaceDetails, nil
}

// NamespaceWebSocketHandler handles WebSocket connections and streams namespace updates.
func NamespaceWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}
	defer conn.Close()

	for {
		// Try to fetch from Redis cache first
		cachedData, err := redis.GetNamespaceCache("namespace_data")
		if err != nil {
			fmt.Println("Redis error:", err)
		}

		var jsonData []byte
		if cachedData == "" {
			// If cache miss, fetch data from Kubernetes
			data, err := GetAllNamespacesWithResources()
			if err != nil {
				err = conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error fetching namespaces: %v", err)))
				if err != nil {
					fmt.Println("WebSocket error:", err)
				}
				if err != nil {
					fmt.Println("WebSocket close error:", err)
				}
				return
			}

			jsonData, _ = json.Marshal(data)
			err = redis.SetNamespaceCache("namespace_data", string(jsonData), 10*time.Second) // Cache data for 10 seconds

			if err != nil {
				fmt.Println("Redis error:", err)
			}
		} else {
			// Use cached data
			jsonData = []byte(cachedData)
		}

		conn.WriteMessage(websocket.TextMessage, jsonData)
		time.Sleep(5 * time.Second) // Stream updates every 5 seconds
	}
}
