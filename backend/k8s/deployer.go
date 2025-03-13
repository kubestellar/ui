package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

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
