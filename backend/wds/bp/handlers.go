package bp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	bpv1alpha1 "github.com/kubestellar/kubestellar/pkg/generated/clientset/versioned/typed/control/v1alpha1"
	"gopkg.in/yaml.v2"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
)

// GetAllBp retrieves all BindingPolicies
func GetAllBp(ctx *gin.Context) {
	fmt.Printf("Debug - Retrieving all binding policies\n")
	fmt.Printf("Debug - KUBECONFIG: %s\n", os.Getenv("KUBECONFIG"))
	fmt.Printf("Debug - wds_context: %s\n", os.Getenv("wds_context"))

	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to create client for BP: %s", err.Error())})
		return
	}

	// Optional namespace filter
	namespace := ctx.Query("namespace")
	listOptions := v1.ListOptions{}

	// Get all binding policies
	bpList, err := c.BindingPolicies().List(context.TODO(), listOptions)
	if err != nil {
		fmt.Printf("Debug - List error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to list binding policies: %s", err.Error())})
		return
	}

	// Add YAML representation to each policy
	for i := range bpList.Items {
		yamlData, err := yaml.Marshal(bpList.Items[i])
		if err != nil {
			fmt.Printf("Debug - YAML marshal error: %v\n", err)
			continue
		}
		// Initialize annotations map if it doesn't exist
		if bpList.Items[i].Annotations == nil {
			bpList.Items[i].Annotations = make(map[string]string)
		}
		// Add the YAML as a string to the policy
		bpList.Items[i].Annotations["yaml"] = string(yamlData)
	}

	if namespace != "" {
		fmt.Printf("Debug - Filtering by namespace: %s\n", namespace)
		filteredBPs := filterBPsByNamespace(bpList.Items, namespace)
		ctx.JSON(http.StatusOK, gin.H{
			"bindingPolicies": filteredBPs,
			"count":           len(filteredBPs),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"bindingPolicies": bpList.Items,
		"count":           len(bpList.Items),
	})
}

// filterBPsByNamespace filters the binding policies by namespace
func filterBPsByNamespace(bps []v1alpha1.BindingPolicy, namespace string) []v1alpha1.BindingPolicy {
	var filtered []v1alpha1.BindingPolicy
	for _, bp := range bps {
		if bp.Namespace == namespace {
			filtered = append(filtered, bp)
		}
	}
	return filtered
}

// CreateBp creates a new BindingPolicy
func CreateBp(ctx *gin.Context) {
	fmt.Printf("Debug - Starting CreateBp handler\n")
	fmt.Printf("Debug - KUBECONFIG: %s\n", os.Getenv("KUBECONFIG"))
	fmt.Printf("Debug - wds_context: %s\n", os.Getenv("wds_context"))

	// Check Content-Type header
	contentType := ctx.GetHeader("Content-Type")
	fmt.Printf("Debug - Content-Type: %s\n", contentType)
	if !strings.Contains(contentType, "multipart/form-data") {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Content-Type must be multipart/form-data"})
		return
	}

	// Get the form file
	file, err := ctx.FormFile("bpYaml")
	if err != nil {
		fmt.Printf("Debug - FormFile error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to get form file: %s", err.Error())})
		return
	}

	fmt.Printf("Debug - Received file: %s\n", file.Filename)

	// Open and read the file
	f, err := file.Open()
	if err != nil {
		fmt.Printf("Debug - File open error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to open file: %s", err.Error())})
		return
	}
	defer f.Close()

	// Read file contents
	bpYamlBytes, err := io.ReadAll(f)
	if err != nil {
		fmt.Printf("Debug - Read error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to read file: %s", err.Error())})
		return
	}

	// Print received YAML for debugging
	fmt.Printf("Debug - Received YAML:\n%s\n", string(bpYamlBytes))

	// First parse into a map to validate structure
	var rawObj map[string]interface{}
	err = yaml.Unmarshal(bpYamlBytes, &rawObj)
	if err != nil {
		fmt.Printf("Debug - Initial YAML parsing error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid YAML format: %s", err.Error())})
		return
	}

	// Extract metadata for name validation before full parsing
	metadata, ok := rawObj["metadata"].(map[interface{}]interface{})
	if !ok {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata section is required"})
		return
	}

	name, ok := metadata["name"].(string)
	if !ok || name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "metadata.name is required"})
		return
	}

	// Create new BP object
	newBP := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			APIVersion: "control.kubestellar.io/v1alpha1",
			Kind:       "BindingPolicy",
		},
		ObjectMeta: v1.ObjectMeta{
			Name: name,
		},
	}

	// Now parse the full YAML into the binding policy
	err = yaml.Unmarshal(bpYamlBytes, newBP)
	if err != nil {
		fmt.Printf("Debug - BindingPolicy unmarshal error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse BindingPolicy: %s", err.Error())})
		return
	}

	// Print the parsed object for debugging
	fmt.Printf("Debug - Parsed BindingPolicy:\n")
	fmt.Printf("Name: %s\n", newBP.Name)
	fmt.Printf("Namespace: %s\n", newBP.Namespace)
	fmt.Printf("APIVersion: %s\n", newBP.APIVersion)
	fmt.Printf("Kind: %s\n", newBP.Kind)
	fmt.Printf("ClusterSelectors: %+v\n", newBP.Spec.ClusterSelectors)
	fmt.Printf("Downsync: %+v\n", newBP.Spec.Downsync)

	// Set default namespace if not specified
	if newBP.ObjectMeta.Namespace == "" {
		newBP.ObjectMeta.Namespace = "default"
	}

	// Get client
	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create client: %s", err.Error())})
		return
	}

	// Create the binding policy
	createdBP, err := c.BindingPolicies().Create(context.TODO(), newBP, v1.CreateOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ctx.JSON(http.StatusConflict, gin.H{
				"error":  fmt.Sprintf("BindingPolicy '%s' in namespace '%s' already exists", newBP.Name, newBP.Namespace),
				"status": "exists",
			})
			return
		}
		fmt.Printf("Debug - BP creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create binding policy: %s", err.Error())})
		return
	}

	// Return success with created BP details
	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Created binding policy '%s' in namespace '%s' successfully", createdBP.Name, createdBP.Namespace),
		"bindingPolicy": gin.H{
			"name":             createdBP.Name,
			"namespace":        createdBP.Namespace,
			"clusterSelectors": createdBP.Spec.ClusterSelectors,
			"downsync":         createdBP.Spec.Downsync,
		},
	})
}

// DeleteBp deletes a BindingPolicy by name and namespace
func DeleteBp(ctx *gin.Context) {
	name := ctx.Query("name")
	namespace := ctx.Query("namespace")

	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "name parameter is required"})
		return
	}

	if namespace == "" {
		namespace = "default"
	}

	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = c.BindingPolicies().Delete(context.TODO(), name, v1.DeleteOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete binding policy '%s' in namespace '%s': %v", name, namespace, err),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Successfully deleted binding policy '%s' in namespace '%s'", name, namespace),
	})
}

// DeleteAllBp deletes all BindingPolicies
func DeleteAllBp(ctx *gin.Context) {
	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Optional namespace filter
	namespace := ctx.Query("namespace")
	listOptions := v1.ListOptions{}
	if namespace != "" {
		listOptions.FieldSelector = fmt.Sprintf("metadata.namespace=%s", namespace)
	}

	err = c.BindingPolicies().DeleteCollection(context.TODO(), v1.DeleteOptions{}, listOptions)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete binding policies: %v", err),
		})
		return
	}

	message := "Deleted all binding policies"
	if namespace != "" {
		message = fmt.Sprintf("Deleted all binding policies in namespace '%s'", namespace)
	}

	ctx.JSON(http.StatusOK, gin.H{"message": message})
}

// getClientForBp creates a new client for BindingPolicy operations
func getClientForBp() (*bpv1alpha1.ControlV1alpha1Client, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = filepath.Join(homedir.HomeDir(), ".kube", "config")
	}
	fmt.Printf("Debug - Using kubeconfig path: %s\n", kubeconfig)

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		fmt.Printf("Debug - LoadFromFile error: %v\n", err)
		return nil, err
	}

	wds_ctx := os.Getenv("wds_context")
	if wds_ctx == "" {
		return nil, fmt.Errorf("env var wds_context not set")
	}
	fmt.Printf("Debug - Using context: %s\n", wds_ctx)

	overrides := &clientcmd.ConfigOverrides{
		CurrentContext: wds_ctx,
	}
	cconfig := clientcmd.NewDefaultClientConfig(*config, overrides)

	restcnfg, err := cconfig.ClientConfig()
	if err != nil {
		fmt.Printf("Debug - ClientConfig error: %v\n", err)
		return nil, err
	}

	c, err := bpv1alpha1.NewForConfig(restcnfg)
	if err != nil {
		fmt.Printf("Debug - NewForConfig error: %v\n", err)
		return nil, err
	}

	return c, nil
}
