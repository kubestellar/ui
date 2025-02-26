package k8s

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/util/retry"
)

// DeploymentTree represents the response hierarchy
type DeploymentTree struct {
	Namespace   string                 `json:"namespace"`
	Deployments []string               `json:"deployments"`
	Services    []string               `json:"services"`
	Configs     map[string]interface{} `json:"configs"`
}

// getResourceGVR maps Kubernetes Kind to GroupVersionResource
func getResourceGVR(kind string) schema.GroupVersionResource {
	switch strings.ToLower(kind) {
	case "deployment":
		return schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	case "service":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "services"}
	case "secret":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "secrets"}
	case "configmap":
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: "configmaps"}
	default:
		return schema.GroupVersionResource{}
	}
}

// applyOrCreateResource intelligently creates or updates a Kubernetes resource
func ApplyOrCreateResource(dynamicClient dynamic.Interface, gvr schema.GroupVersionResource, obj *unstructured.Unstructured, namespace string) error {
	resource := dynamicClient.Resource(gvr).Namespace(namespace)

	// Retry logic for better resilience
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

// DeployManifests applies Kubernetes manifests from a directory
func DeployManifests(deployPath string) (*DeploymentTree, error) {
	_, dynamicClient, err := GetClientSet()
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes client: %v", err)
	}

	files, err := os.ReadDir(deployPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read folder: %v", err)
	}

	tree := &DeploymentTree{Configs: make(map[string]interface{})}
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

		// Get correct resource GVR
		gvr := getResourceGVR(obj.GetKind())
		if gvr.Resource == "" {
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

		// Apply (create or update) the resource
		err = ApplyOrCreateResource(dynamicClient, gvr, &obj, finalNamespace)
		if err != nil {
			return nil, fmt.Errorf("failed to apply %s: %v", obj.GetKind(), err)
		}

		// Organize in hierarchy
		switch obj.GetKind() {
		case "Deployment":
			tree.Deployments = append(tree.Deployments, obj.GetName())
		case "Service":
			tree.Services = append(tree.Services, obj.GetName())
		case "ConfigMap", "Secret":
			tree.Configs[obj.GetKind()] = obj.GetName()
		}
	}

	// Use detected namespace or "default" if none was found
	if detectedNamespace == "" {
		detectedNamespace = "default"
	}

	tree.Namespace = detectedNamespace
	return tree, nil
}
