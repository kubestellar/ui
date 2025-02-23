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

// create BP
func CreateBp(ctx *gin.Context) {

	bpFile, err := ctx.FormFile("bpYaml")
	if err != nil {
		fmt.Printf("Debug - FormFile error: %v\n", err)
		ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Errorf("failed to get bp yaml: %s", err.Error())})
		return
	}

	f, err := bpFile.Open()
	if err != nil {
		fmt.Printf("Debug - File open error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to open to read bp yaml: %s", err.Error())})
		return
	}
	defer f.Close()

	bpYamlBytes, err := io.ReadAll(f)
	if err != nil {
		fmt.Printf("Debug - Read error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to read bp yaml: %s", err.Error())})
		return
	}

	var bps v1alpha1.BindingPolicy
	err = yaml.Unmarshal(bpYamlBytes, &bps)
	if err != nil {
		fmt.Printf("Debug - YAML unmarshal error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to parse bp yaml: %s", err.Error())})
		return
	}

	// Create new metadata if it's nil
	if bps.ObjectMeta.Name == "" {
		bps.ObjectMeta.Name = "test-binding-policy"
	}

	c, err := getClientForBp()
	if err != nil {
		fmt.Printf("Debug - Client creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to create client for BP: %s", err.Error())})
		return
	}

	// Create with explicit TypeMeta
	newBP := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			APIVersion: "control.kubestellar.io/v1alpha1",
			Kind:       "BindingPolicy",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      bps.ObjectMeta.Name,
			Namespace: bps.ObjectMeta.Namespace,
		},
		Spec: bps.Spec,
	}

	_, err = c.BindingPolicies().Create(context.TODO(), newBP, v1.CreateOptions{})
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			ctx.JSON(http.StatusConflict, gin.H{
				"error":  fmt.Sprintf("BindingPolicy '%s' already exists", newBP.Name),
				"status": "exists",
			})
			return
		}
		fmt.Printf("Debug - BP creation error: %v\n", err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Errorf("failed to create Binding policy: %s", err.Error())})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Created binding policy successfully"})
}

// delete BP by name
func DeleteBp(ctx *gin.Context) {
	name := ctx.Query("name")
	if name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "expected name for BP"})
		return
	}
	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	err = c.BindingPolicies().Delete(context.TODO(), name, v1.DeleteOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete binding policy"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": fmt.Errorf("deleted bp %s", name)})

}

// delete all BPs
func DeleteAllBp(ctx *gin.Context) {
	c, err := getClientForBp()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	err = c.BindingPolicies().DeleteCollection(context.TODO(), v1.DeleteOptions{}, v1.ListOptions{})
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "Deleted all BPs"})
}

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
