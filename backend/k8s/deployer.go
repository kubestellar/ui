package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/repo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/retry"
)

const (
	// KubeStellarNamespace is the default namespace for KubeStellar deployments
	KubeStellarNamespace = "kubestellar"
	// DefaultContext is the default Kubernetes context for KubeStellar
	DefaultContext = "wds1"
	// GitHubConfigMapName is the ConfigMap name for storing GitHub repository data
	GitHubConfigMapName = "kubestellar-github"
	// HelmConfigMapName is the ConfigMap name for storing Helm chart data
	HelmConfigMapName = "kubestellar-helm"
	// HelmDeploymentsKey is the key in ConfigMap for storing multiple Helm deployments
	HelmDeploymentsKey = "deployments"
)

// DeploymentTree represents the hierarchical response of deployed resources
type DeploymentTree struct {
	Namespace string                 `json:"namespace"`
	Resources map[string]interface{} `json:"resources"` // Hierarchical resource mapping
}

// HelmDeploymentRequest represents the request payload for deploying a Helm chart
type HelmDeploymentRequest struct {
	RepoName    string            `json:"repoName"`
	RepoURL     string            `json:"repoURL"`
	ChartName   string            `json:"chartName"`
	Namespace   string            `json:"namespace"`
	ReleaseName string            `json:"releaseName"`
	Version     string            `json:"version"`
	Values      map[string]string `json:"values,omitempty"`
	ConfigMaps  []ConfigMapRef    `json:"configMaps,omitempty"`
}

// HelmDeploymentData represents data about a Helm deployment to be stored
type HelmDeploymentData struct {
	ID           string                 `json:"id"`
	Timestamp    string                 `json:"timestamp"`
	RepoName     string                 `json:"repoName"`
	RepoURL      string                 `json:"repoURL"`
	ChartName    string                 `json:"chartName"`
	ReleaseName  string                 `json:"releaseName"`
	Namespace    string                 `json:"namespace"`
	Version      string                 `json:"version"`
	ReleaseInfo  string                 `json:"releaseInfo"`
	ChartVersion string                 `json:"chartVersion"`
	Values       map[string]interface{} `json:"values,omitempty"`
}

// ConfigMapRef represents a reference to a ConfigMap for chart values
type ConfigMapRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// getResourceGVR dynamically fetches the correct GroupVersionResource (GVR) using the Discovery API
func getResourceGVR(discoveryClient discovery.DiscoveryInterface, kind string) (schema.GroupVersionResource, error) {
	resourceList, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		return schema.GroupVersionResource{}, fmt.Errorf("failed to get API resources: %v", err)
	}

	for _, resourceGroup := range resourceList {
		for _, resource := range resourceGroup.APIResources {
			if strings.EqualFold(resource.Kind, kind) {
				gv, err := schema.ParseGroupVersion(resourceGroup.GroupVersion)
				if err != nil {
					return schema.GroupVersionResource{}, err
				}
				return schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: resource.Name}, nil
			}
		}
	}
	return schema.GroupVersionResource{}, fmt.Errorf("resource kind '%s' not found", kind)
}

// DeployManifests applies Kubernetes manifests from a directory with optional dry-run mode
func DeployManifests(deployPath string, dryRun bool, dryRunStrategy string) (*DeploymentTree, error) {
	clientSet, dynamicClient, err := GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	discoveryClient := clientSet.Discovery()
	files, err := os.ReadDir(deployPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read folder: %v", err)
	}

	tree := &DeploymentTree{Resources: make(map[string]interface{})}
	var detectedNamespace string
	appliedResources := make(map[string][]string)

	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".yaml") {
			continue
		}

		filePath := filepath.Join(deployPath, file.Name())
		data, err := os.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read manifest %s: %v", filePath, err)
		}

		var obj unstructured.Unstructured
		if err := yaml.Unmarshal(data, &obj); err != nil {
			return nil, fmt.Errorf("failed to parse YAML %s: %v", filePath, err)
		}

		// Get correct resource GVR using Discovery API
		gvr, err := getResourceGVR(discoveryClient, obj.GetKind())
		if err != nil {
			fmt.Printf("Skipping unsupported kind: %s\n", obj.GetKind())
			continue
		}

		// Detect namespace dynamically
		namespace := obj.GetNamespace()
		if namespace != "" {
			detectedNamespace = namespace
		}

		// Use detected namespace or fallback to "default"
		finalNamespace := detectedNamespace
		if finalNamespace == "" {
			finalNamespace = "default"
		}

		// Ensure namespace exists before applying resources
		if !dryRun && obj.GetKind() != "Namespace" {
			err = EnsureNamespaceExists(dynamicClient, finalNamespace)
			if err != nil {
				return nil, fmt.Errorf("failed to ensure namespace %s exists: %v", finalNamespace, err)
			}
		}

		// Apply or simulate resource application
		err = applyOrCreateResource(dynamicClient, gvr, &obj, finalNamespace, dryRun, dryRunStrategy)
		if err != nil {
			return nil, fmt.Errorf("failed to apply %s: %v", obj.GetKind(), err)
		}

		// Organize in hierarchical structure
		if _, exists := tree.Resources[obj.GetKind()]; !exists {
			tree.Resources[obj.GetKind()] = []string{}
			appliedResources[obj.GetKind()] = []string{}
		}
		tree.Resources[obj.GetKind()] = append(tree.Resources[obj.GetKind()].([]string), obj.GetName())
		appliedResources[obj.GetKind()] = append(appliedResources[obj.GetKind()], obj.GetName())
	}

	// Use detected namespace or "default" if none was found
	if detectedNamespace == "" {
		detectedNamespace = "default"
	}

	tree.Namespace = detectedNamespace
	return tree, nil
}

// EnsureNamespaceExists checks if a namespace exists and creates it if it doesn't
func EnsureNamespaceExists(dynamicClient dynamic.Interface, namespace string) error {
	// Skip for default namespace which always exists
	if namespace == "default" {
		return nil
	}

	// Get the GVR for Namespace
	nsGVR := schema.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"}

	// Check if namespace exists
	_, err := dynamicClient.Resource(nsGVR).Get(context.TODO(), namespace, v1.GetOptions{})
	if err == nil {
		// Namespace exists
		return nil
	}

	// Create namespace if it doesn't exist
	fmt.Printf("Creating namespace: %s\n", namespace)
	nsObj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "v1",
			"kind":       "Namespace",
			"metadata": map[string]interface{}{
				"name": namespace,
			},
		},
	}

	_, err = dynamicClient.Resource(nsGVR).Create(context.TODO(), nsObj, v1.CreateOptions{})
	if err != nil {
		return fmt.Errorf("failed to create namespace %s: %v", namespace, err)
	}

	return nil
}

// applyOrCreateResource applies or simulates applying a Kubernetes resource
func applyOrCreateResource(dynamicClient dynamic.Interface, gvr schema.GroupVersionResource, obj *unstructured.Unstructured, namespace string, dryRun bool, dryRunStrategy string) error {
	resource := dynamicClient.Resource(gvr).Namespace(namespace)

	// If dry-run, simulate creation based on strategy
	if dryRun {
		if dryRunStrategy == "server" {
			fmt.Printf("[Server Dry Run] Validating %s %s on server\n", obj.GetKind(), obj.GetName())
			// Use server-side dry run for validation
			dryRunOpts := v1.CreateOptions{DryRun: []string{"All"}}
			_, err := resource.Create(context.TODO(), obj, dryRunOpts)
			if err != nil {
				return fmt.Errorf("server validation failed for %s %s: %v", obj.GetKind(), obj.GetName(), err)
			}
			fmt.Printf("[Server Dry Run] Validated: %s %s\n", obj.GetKind(), obj.GetName())
		} else {
			// Client-side dry run (just log the action)
			fmt.Printf("[Client Dry Run] Would apply %s %s in namespace %s\n", obj.GetKind(), obj.GetName(), namespace)
		}
		return nil
	}

	// Retry logic for resilience
	return retry.OnError(retry.DefaultRetry, func(err error) bool { return true }, func() error {
		existing, err := resource.Get(context.TODO(), obj.GetName(), v1.GetOptions{})
		if err == nil {
			// Resource exists, update it
			obj.SetResourceVersion(existing.GetResourceVersion()) // Keep the resource version
			_, updateErr := resource.Update(context.TODO(), obj, v1.UpdateOptions{})
			if updateErr != nil {
				return fmt.Errorf("failed to update %s %s: %v", obj.GetKind(), obj.GetName(), updateErr)
			}
			fmt.Printf("Updated: %s %s\n", obj.GetKind(), obj.GetName())
		} else {
			// Resource doesn't exist, create it
			_, createErr := resource.Create(context.TODO(), obj, v1.CreateOptions{})
			if createErr != nil {
				return fmt.Errorf("failed to create %s %s: %v", obj.GetKind(), obj.GetName(), createErr)
			}
			fmt.Printf("Created: %s %s\n", obj.GetKind(), obj.GetName())
		}
		return nil
	})
}

// PrettyPrint prints JSON formatted output of DeploymentTree
func PrettyPrint(tree *DeploymentTree) {
	jsonData, err := json.MarshalIndent(tree, "", "  ")
	if err != nil {
		fmt.Println("Error converting tree to JSON:", err)
		return
	}
	fmt.Println(string(jsonData))
}

// Store Manifests deployment data to a ConfigMap
func StoreManifestsDeployment(data map[string]string) error {
	return storeConfigMapData("kubestellar-manifests", data)
}

// storeConfigMapData creates or updates a ConfigMap with the provided data
func storeConfigMapData(configMapName string, data map[string]string) error {
	// Ensure namespace exists first
	clientset, dynamicClient, err := GetClientSetWithContext("its1")
	if err != nil {
		return fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	// Ensure the namespace exists
	if err := EnsureNamespaceExists(dynamicClient, KubeStellarNamespace); err != nil {
		return fmt.Errorf("failed to ensure namespace for ConfigMap: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use retry for resilience against transient errors
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// Try to get existing ConfigMap
		existing, err := clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Get(ctx, configMapName, v1.GetOptions{})
		if err != nil {
			if !errors.IsNotFound(err) {
				return fmt.Errorf("failed to check if ConfigMap exists: %v", err)
			}

			// ConfigMap doesn't exist, create a new one
			configMap := &corev1.ConfigMap{
				ObjectMeta: v1.ObjectMeta{
					Name:      configMapName,
					Namespace: KubeStellarNamespace,
				},
				Data: data,
			}

			_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Create(ctx, configMap, v1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("failed to create ConfigMap: %v", err)
			}
			return nil
		}

		// ConfigMap exists, update it
		existing.Data = data
		_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Update(ctx, existing, v1.UpdateOptions{})
		return err
	})
}

// GetConfigMapData retrieves data from a ConfigMap
func GetConfigMapData(contextName string, configMapName string) (map[string]string, error) {
	clientset, _, err := GetClientSetWithContext(contextName)
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	configMap, err := clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Get(ctx, configMapName, v1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return configMap.Data, nil
}

// Helper function to marshal an object to JSON string
func mustMarshalToString(obj interface{}) string {
	jsonData, err := json.Marshal(obj)
	if err != nil {
		return fmt.Sprintf("{\"error\": \"Failed to marshal: %v\"}", err)
	}
	return string(jsonData)
}

// StoreHelmDeployment stores Helm deployment data as a new entry in a multi-deployment ConfigMap
func StoreHelmDeployment(deploymentData map[string]string) error {
	clientset, dynamicClient, err := GetClientSetWithContext("its1")
	if err != nil {
		return fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	// Ensure the namespace exists
	if err := EnsureNamespaceExists(dynamicClient, KubeStellarNamespace); err != nil {
		return fmt.Errorf("failed to ensure namespace for ConfigMap: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Generate unique ID for the deployment
	deploymentID := fmt.Sprintf("%s-%s-%s", deploymentData["releaseName"], deploymentData["namespace"], time.Now().Format("20060102150405"))

	// Create proper structured deployment data
	helmData := HelmDeploymentData{
		ID:           deploymentID,
		Timestamp:    deploymentData["timestamp"],
		RepoName:     deploymentData["repoName"],
		RepoURL:      deploymentData["repoURL"],
		ChartName:    deploymentData["chartName"],
		ReleaseName:  deploymentData["releaseName"],
		Namespace:    deploymentData["namespace"],
		Version:      deploymentData["version"],
		ReleaseInfo:  deploymentData["releaseInfo"],
		ChartVersion: deploymentData["chartVersion"],
	}

	// Parse values if present
	if valuesStr, ok := deploymentData["values"]; ok && valuesStr != "" {
		var values map[string]interface{}
		if err := json.Unmarshal([]byte(valuesStr), &values); err == nil {
			helmData.Values = values
		}
	}

	// Use retry for resilience against transient errors
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// Try to get existing ConfigMap
		existing, err := clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Get(ctx, HelmConfigMapName, v1.GetOptions{})
		if err != nil {
			if !errors.IsNotFound(err) {
				return fmt.Errorf("failed to check if ConfigMap exists: %v", err)
			}

			// ConfigMap doesn't exist, create a new one with initial deployment
			deployments := []HelmDeploymentData{helmData}
			deploymentsJSON, err := json.Marshal(deployments)
			if err != nil {
				return fmt.Errorf("failed to marshal deployments: %v", err)
			}

			configMap := &corev1.ConfigMap{
				ObjectMeta: v1.ObjectMeta{
					Name:      HelmConfigMapName,
					Namespace: KubeStellarNamespace,
				},
				Data: map[string]string{
					HelmDeploymentsKey: string(deploymentsJSON),
				},
			}

			_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Create(ctx, configMap, v1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("failed to create ConfigMap: %v", err)
			}
			return nil
		}

		// ConfigMap exists, update it by adding the new deployment
		var deployments []HelmDeploymentData

		// Check if we already have deployments data
		if deploymentsJSON, ok := existing.Data[HelmDeploymentsKey]; ok && deploymentsJSON != "" {
			if err := json.Unmarshal([]byte(deploymentsJSON), &deployments); err != nil {
				// If we can't parse existing data, start with an empty array
				deployments = []HelmDeploymentData{}
			}
		} else {
			// No existing deployments, initialize empty array
			deployments = []HelmDeploymentData{}
		}

		// Add new deployment
		deployments = append(deployments, helmData)

		// Marshal updated deployments array
		deploymentsJSON, err := json.Marshal(deployments)
		if err != nil {
			return fmt.Errorf("failed to marshal updated deployments: %v", err)
		}

		// Update ConfigMap
		if existing.Data == nil {
			existing.Data = make(map[string]string)
		}
		existing.Data[HelmDeploymentsKey] = string(deploymentsJSON)

		_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Update(ctx, existing, v1.UpdateOptions{})
		return err
	})
}

func StoreGitHubDeployment(deploymentData map[string]string) error {
	clientset, dynamicClient, err := GetClientSetWithContext("its1")
	if err != nil {
		return fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	// Ensure the namespace exists
	if err := EnsureNamespaceExists(dynamicClient, KubeStellarNamespace); err != nil {
		return fmt.Errorf("failed to ensure namespace for ConfigMap: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Use retry for resilience against transient errors
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// Try to get existing ConfigMap
		configMap, err := clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Get(ctx, GitHubConfigMapName, v1.GetOptions{})
		if err != nil {
			if !errors.IsNotFound(err) {
				return fmt.Errorf("failed to check if ConfigMap exists: %v", err)
			}

			// ConfigMap doesn't exist, create a new one
			configMap = &corev1.ConfigMap{
				ObjectMeta: v1.ObjectMeta{
					Name:      GitHubConfigMapName,
					Namespace: KubeStellarNamespace,
				},
				Data: deploymentData,
			}

			_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Create(ctx, configMap, v1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("failed to create ConfigMap: %v", err)
			}
			return nil
		}

		// ConfigMap exists, update it
		if configMap.Data == nil {
			configMap.Data = make(map[string]string)
		}

		for key, value := range deploymentData {
			configMap.Data[key] = value
		}

		_, err = clientset.CoreV1().ConfigMaps(KubeStellarNamespace).Update(ctx, configMap, v1.UpdateOptions{})
		return err
	})
}

func GetGithubDeployments(contextName string) ([]any, error) {
	configMapData, err := GetConfigMapData(contextName, GitHubConfigMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get GitHub ConfigMap: %v", err)
	}
	deploymentsJSON, ok := configMapData["deployments"]
	if !ok || deploymentsJSON == "" {
		return []any{}, nil // Return empty array, not an error
	}
	var deployments []any
	if err := json.Unmarshal([]byte(deploymentsJSON), &deployments); err != nil {
		return nil, fmt.Errorf("failed to parse deployments data: %v", err)
	}
	return deployments, nil
}

// GetHelmDeployments retrieves all stored Helm deployments
func GetHelmDeployments(contextName string) ([]HelmDeploymentData, error) {
	configMapData, err := GetConfigMapData(contextName, HelmConfigMapName)
	if err != nil {
		return nil, fmt.Errorf("failed to get Helm ConfigMap: %v", err)
	}

	deploymentsJSON, ok := configMapData[HelmDeploymentsKey]
	if !ok || deploymentsJSON == "" {
		return []HelmDeploymentData{}, nil // Return empty array, not an error
	}

	var deployments []HelmDeploymentData
	if err := json.Unmarshal([]byte(deploymentsJSON), &deployments); err != nil {
		return nil, fmt.Errorf("failed to parse deployments data: %v", err)
	}

	return deployments, nil
}

// GetHelmDeploymentByID retrieves a specific Helm deployment by its ID
func GetHelmDeploymentByID(contextName, deploymentID string) (*HelmDeploymentData, error) {
	deployments, err := GetHelmDeployments(contextName)
	if err != nil {
		return nil, err
	}

	for _, deployment := range deployments {
		if deployment.ID == deploymentID {
			return &deployment, nil
		}
	}

	return nil, fmt.Errorf("deployment with ID %s not found", deploymentID)
}

// GetHelmDeploymentsByRelease retrieves all deployments for a specific release name
func GetHelmDeploymentsByRelease(contextName, releaseName string) ([]HelmDeploymentData, error) {
	deployments, err := GetHelmDeployments(contextName)
	if err != nil {
		return nil, err
	}

	var filtered []HelmDeploymentData
	for _, deployment := range deployments {
		if deployment.ReleaseName == releaseName {
			filtered = append(filtered, deployment)
		}
	}

	return filtered, nil
}

// GetHelmDeploymentsByNamespace retrieves all deployments in a specific namespace
func GetHelmDeploymentsByNamespace(contextName, namespace string) ([]HelmDeploymentData, error) {
	deployments, err := GetHelmDeployments(contextName)
	if err != nil {
		return nil, err
	}

	var filtered []HelmDeploymentData
	for _, deployment := range deployments {
		if deployment.Namespace == namespace {
			filtered = append(filtered, deployment)
		}
	}

	return filtered, nil
}

func deployHelmChart(req HelmDeploymentRequest, store bool) (*release.Release, error) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Check current context first to avoid unnecessary switching
	cmd := exec.CommandContext(ctx, "kubectl", "config", "current-context")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get current context: %v", err)
	}

	currentContext := strings.TrimSpace(string(output))
	needsContextSwitch := currentContext != "wds1"

	// Only switch if needed
	if needsContextSwitch {
		cmd = exec.CommandContext(ctx, "kubectl", "config", "use-context", "wds1")
		if err := cmd.Run(); err != nil {
			return nil, fmt.Errorf("failed to switch to wds1 context: %v", err)
		}

		// Ensure the original context is restored after execution
		defer func() {
			restoreCmd := exec.CommandContext(ctx, "kubectl", "config", "use-context", currentContext)
			if restoreErr := restoreCmd.Run(); restoreErr != nil {
				fmt.Printf("Warning: failed to restore original context: %v\n", restoreErr)
			}
		}()
	}

	// Get Kubernetes client to check/create namespace
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	// Ensure namespace exists before proceeding
	if err := EnsureNamespaceExists(dynamicClient, req.Namespace); err != nil {
		return nil, fmt.Errorf("failed to ensure namespace exists: %v", err)
	}

	// Initialize Helm action configuration
	actionConfig := new(action.Configuration)
	settings := cli.New()

	// Use concurrent initialization where possible
	initDone := make(chan error, 1)
	go func() {
		initDone <- actionConfig.Init(settings.RESTClientGetter(), req.Namespace, os.Getenv("HELM_DRIVER"),
			func(format string, v ...interface{}) {})
	}()

	// Wait for Helm initialization to complete
	if err := <-initDone; err != nil {
		return nil, fmt.Errorf("failed to initialize Helm: %v", err)
	}

	// Check if repo already exists to avoid redundant adds
	repoFile := settings.RepositoryConfig
	repoExists := false

	if _, err := os.Stat(repoFile); err == nil {
		b, err := os.ReadFile(repoFile)
		if err == nil {
			var repos repo.File
			if err := yaml.Unmarshal(b, &repos); err == nil {
				for _, r := range repos.Repositories {
					if r.Name == req.RepoName && r.URL == req.RepoURL {
						repoExists = true
						break
					}
				}
			}
		}
	}

	// Only add repo if it doesn't exist
	if !repoExists {
		addRepoCmd := exec.CommandContext(ctx, "helm", "repo", "add", req.RepoName, req.RepoURL, "--force-update")
		if out, err := addRepoCmd.CombinedOutput(); err != nil {
			return nil, fmt.Errorf("failed to add helm repository: %v, output: %s", err, string(out))
		}
	}

	// Run Helm install with optimized configuration
	install := action.NewInstall(actionConfig)
	install.ReleaseName = req.ReleaseName
	install.Namespace = req.Namespace
	install.Version = req.Version
	install.Wait = false // Don't wait for resources to be ready to speed up deployment

	// Locate and load chart concurrently
	type chartResult struct {
		chartObj *chart.Chart
		err      error
	}
	chartChan := make(chan chartResult, 1)

	go func() {
		chartPath, err := install.ChartPathOptions.LocateChart(fmt.Sprintf("%s/%s", req.RepoName, req.ChartName), settings)
		if err != nil {
			chartChan <- chartResult{nil, fmt.Errorf("failed to locate chart: %v", err)}
			return
		}

		chartObj, err := loader.Load(chartPath)
		chartChan <- chartResult{chartObj, err}
	}()

	// Get chart result
	chartRes := <-chartChan
	if chartRes.err != nil {
		return nil, chartRes.err
	}

	// Prepare values for the chart
	chartValues := make(map[string]interface{})

	// Convert string values to interface map
	for k, v := range req.Values {
		// Try to parse JSON values
		if strings.HasPrefix(v, "{") || strings.HasPrefix(v, "[") {
			var jsonValue interface{}
			if err := json.Unmarshal([]byte(v), &jsonValue); err == nil {
				chartValues[k] = jsonValue
			} else {
				chartValues[k] = v
			}
		} else {
			chartValues[k] = v
		}
	}

	// Set a reasonable timeout for the installation
	install.Timeout = 4 * time.Minute

	// Install the chart
	release, err := install.Run(chartRes.chartObj, chartValues)
	if err != nil {
		return nil, fmt.Errorf("failed to install chart: %v", err)
	}

	if store {

		// Store deployment information in ConfigMap
		helmDeployData := map[string]string{
			"timestamp":    time.Now().Format(time.RFC3339),
			"repoName":     req.RepoName,
			"repoURL":      req.RepoURL,
			"chartName":    req.ChartName,
			"releaseName":  req.ReleaseName,
			"namespace":    req.Namespace,
			"version":      req.Version,
			"releaseInfo":  release.Info.Status.String(),
			"chartVersion": release.Chart.Metadata.Version,
			"values":       mustMarshalToString(release.Chart.Values),
		}
		// Store deployment data in ConfigMap
		err = StoreHelmDeployment(helmDeployData)
		if err != nil {
			fmt.Printf("Warning: failed to store Helm deployment data in ConfigMap: %v\n", err)
		} else {
			fmt.Printf("Helm deployment data stored in ConfigMap: %s\n", HelmConfigMapName)
		}

	}

	return release, nil
}

// HelmDeployHandler handles API requests to deploy Helm charts
func HelmDeployHandler(c *gin.Context) {
	var req HelmDeploymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	// Parse the "store" parameter from the query string
	storeQuery := c.Query("store")
	store := false
	if storeQuery == "true" {
		store = true
	}

	// Pass the parsed "store" parameter to deployHelmChart
	release, err := deployHelmChart(req, store)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Deployment failed: %v", err)})
		return
	}

	response := gin.H{
		"message":   "Helm chart deployed successfully",
		"release":   release.Name,
		"namespace": release.Namespace,
		"version":   release.Chart.Metadata.Version,
		"status":    release.Info.Status.String(),
	}

	// Include storage information in the response if "store" is true
	if store {
		response["stored_in"] = "kubestellar-helm ConfigMap"
	}

	c.JSON(http.StatusOK, response)
}

func ListGithubDeployments(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")

	deployments, err := GetGithubDeployments(contextName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to retrieve deployments: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "GitHub deployments retrieved successfully",
		"count":       len(deployments),
		"deployments": deployments,
	})
}

// ListHelmDeploymentsHandler handles API requests to list all Helm deployments
func ListHelmDeploymentsHandler(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")

	deployments, err := GetHelmDeployments(contextName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to retrieve deployments: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Helm deployments retrieved successfully",
		"count":       len(deployments),
		"deployments": deployments,
	})
}

func ListGithubDeploymentsHandler(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")

	deployments, err := GetGithubDeployments(contextName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to retrieve deployments: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "GitHub deployments retrieved successfully",
		"count":       len(deployments),
		"deployments": deployments,
	})
}

// GetHelmDeploymentHandler handles API requests to get a specific Helm deployment by ID
func GetHelmDeploymentHandler(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")
	deploymentID := c.Param("id")

	if deploymentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deployment ID is required"})
		return
	}

	deployment, err := GetHelmDeploymentByID(contextName, deploymentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("Deployment not found: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Helm deployment retrieved successfully",
		"deployment": deployment,
	})
}

// ListHelmDeploymentsByNamespaceHandler handles API requests to list deployments by namespace
func ListHelmDeploymentsByNamespaceHandler(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")
	namespace := c.Param("namespace")

	if namespace == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Namespace is required"})
		return
	}

	deployments, err := GetHelmDeploymentsByNamespace(contextName, namespace)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to retrieve deployments: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Helm deployments in namespace %s retrieved successfully", namespace),
		"count":       len(deployments),
		"namespace":   namespace,
		"deployments": deployments,
	})
}

// ListHelmDeploymentsByReleaseHandler handles API requests to list deployments by release name
func ListHelmDeploymentsByReleaseHandler(c *gin.Context) {
	contextName := c.DefaultQuery("context", "its1")
	releaseName := c.Param("release")

	if releaseName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Release name is required"})
		return
	}

	deployments, err := GetHelmDeploymentsByRelease(contextName, releaseName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to retrieve deployments: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     fmt.Sprintf("Helm deployments for release %s retrieved successfully", releaseName),
		"count":       len(deployments),
		"release":     releaseName,
		"deployments": deployments,
	})
}
