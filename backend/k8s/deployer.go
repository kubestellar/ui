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

	"github.com/gin-gonic/gin"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/getter"
	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/repo"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/retry"
)

// DeploymentTree represents the hierarchical response of deployed resources
type DeploymentTree struct {
	Namespace string                 `json:"namespace"`
	Resources map[string]interface{} `json:"resources"` // Hierarchical resource mapping
}

// HelmDeploymentRequest represents the request payload for deploying a Helm chart
type HelmDeploymentRequest struct {
	RepoName    string `json:"repoName"`
	RepoURL     string `json:"repoURL"`
	ChartName   string `json:"chartName"`
	Namespace   string `json:"namespace"`
	ReleaseName string `json:"releaseName"`
	Version     string `json:"version"`
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
		}
		tree.Resources[obj.GetKind()] = append(tree.Resources[obj.GetKind()].([]string), obj.GetName())
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

func deployHelmChart(req HelmDeploymentRequest) (*release.Release, error) {
	// Save the current Kubernetes context
	cmd := exec.Command("kubectl", "config", "current-context")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get current context: %v", err)
	}
	originalContext := strings.TrimSpace(string(output))

	// Switch to wds1 context
	cmd = exec.Command("kubectl", "config", "use-context", "wds1")
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to switch to wds1 context: %v", err)
	}

	// Ensure the original context is restored after execution
	defer func() {
		restoreCmd := exec.Command("kubectl", "config", "use-context", originalContext)
		if restoreErr := restoreCmd.Run(); restoreErr != nil {
			fmt.Printf("Warning: failed to restore original context: %v\n", restoreErr)
		} else {
			fmt.Printf("Successfully restored original context: %s\n", originalContext)
		}
	}()

	// Initialize Helm action configuration
	actionConfig := new(action.Configuration)
	settings := cli.New()

	if err := actionConfig.Init(settings.RESTClientGetter(), req.Namespace, os.Getenv("HELM_DRIVER"), func(format string, v ...interface{}) {
		fmt.Printf("[Helm Debug] "+format+"\n", v...)
	}); err != nil {
		return nil, fmt.Errorf("failed to initialize Helm: %v", err)
	}

	// Add Helm repository using Helm SDK (in-memory update)
	repoEntry := repo.Entry{
		Name: req.RepoName,
		URL:  req.RepoURL,
	}
	repoFile := repo.NewFile()
	repoFile.Update(&repoEntry)

	// Initialize Helm repo client
	providers := getter.All(settings)
	repoClient, err := repo.NewChartRepository(&repoEntry, providers)
	if err != nil {
		return nil, fmt.Errorf("failed to create chart repository client: %v", err)
	}
	repoClient.CachePath = settings.RepositoryCache

	// Download repository index (using the SDK)
	if _, err := repoClient.DownloadIndexFile(); err != nil {
		return nil, fmt.Errorf("failed to download repository index: %v", err)
	}

	// **Add the repository via Helm CLI so that the CLI configuration is updated**
	addRepoCmd := exec.Command("helm", "repo", "add", req.RepoName, req.RepoURL)
	addRepoOutput, err := addRepoCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to add helm repository: %v, output: %s", err, string(addRepoOutput))
	}

	// **Update Helm repositories before locating the chart**
	updateCmd := exec.Command("helm", "repo", "update")
	updateOutput, err := updateCmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("failed to update Helm repositories: %v, output: %s", err, string(updateOutput))
	}

	// Run Helm install
	install := action.NewInstall(actionConfig)
	install.ReleaseName = req.ReleaseName
	install.Namespace = req.Namespace
	install.Version = req.Version

	// Locate the chart
	chartPath, err := install.ChartPathOptions.LocateChart(fmt.Sprintf("%s/%s", req.RepoName, req.ChartName), settings)
	if err != nil {
		return nil, fmt.Errorf("failed to locate chart: %v", err)
	}

	// Load the chart
	chart, err := loader.Load(chartPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load chart: %v", err)
	}

	// Install the chart
	release, err := install.Run(chart, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to install chart: %v", err)
	}

	fmt.Printf("Successfully deployed Helm chart: %s\n", req.ReleaseName)
	return release, nil
}

// HelmDeployHandler handles API requests to deploy Helm charts
func HelmDeployHandler(c *gin.Context) {
	var req HelmDeploymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	release, err := deployHelmChart(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Deployment failed: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Helm chart deployed successfully",
		"release":   release.Name,
		"namespace": release.Namespace,
		"version":   release.Chart.Metadata.Version,
		"status":    release.Info.Status.String(),
	})
}
