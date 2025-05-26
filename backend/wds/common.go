package wds

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/cli/values"
	"helm.sh/helm/v3/pkg/getter"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

/*
Load the KubeConfig file and return the kubernetes clientset which gives you access to play with the k8s api
*/
func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}

func getKubeConfig() (*api.Config, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}
	return config, nil
}

// only for wds1
func GetClientSetKubeConfig() (*kubernetes.Clientset, error) {
	config, err := getKubeConfig()
	if err != nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kubeconfig"})
		return nil, fmt.Errorf("failed to load kubeconfig")
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ctxConfig"})
		return nil, fmt.Errorf("failed to create ctxConfig")
	}

	// Create config for WDS cluster
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to create restconfig")
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kubernetes client")
	}
	return clientset, nil
}

// ListContexts returns the current context and all available WDS contexts from the kubeconfig.
// It filters contexts that contain 'wds' (case-insensitive).
func ListContexts() (string, []string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	currentContext := config.CurrentContext
	var wdsContexts []string

	// Pre-allocate slice with estimated capacity for better performance
	wdsContexts = make([]string, 0, len(config.Contexts)/2) // Assuming about half might be WDS contexts

	for name := range config.Contexts {
		if strings.Contains(strings.ToLower(name), "wds") {
			wdsContexts = append(wdsContexts, name)
		}
	}

	return currentContext, wdsContexts, nil
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func writeMessage(conn *websocket.Conn, message string) {
	if err := conn.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
		log.Println("Error writing to WebSocket:", err)
	}
}
func SetWdsContextCookies(c *gin.Context) {
	var request struct {
		Context string `json:"context"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	_, context, err := ListContexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	isContextPresent := false
	for _, value := range context {
		if strings.EqualFold(request.Context, value) {
			isContextPresent = true
			break
		}
	}
	if !isContextPresent {
		msg := fmt.Sprintf("no context with %s present", request.Context)
		c.JSON(http.StatusOK, gin.H{
			"error":   msg,
			"message": "Please create context first",
		})
		return
	}
	c.SetCookie("ui-wds-context", request.Context, 3600, "/", "", false, true)
	msg := fmt.Sprintf("switched to %s context", request.Context)
	c.JSON(http.StatusOK, gin.H{
		"message":            msg,
		"current-ui-context": request.Context,
	})
}

// GetWdsContextCookies retrieves the current WDS context from cookies or falls back to system context.
// It returns the UI context, system context, and other available WDS contexts.
func GetWdsContextCookies(c *gin.Context) {
	currentContext, wdsContexts, err := ListContexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get kubeconfig contexts: %v", err)})
		return
	}

	// Try to get context from cookie first
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		// If no cookie set, use current context if it's a WDS context, otherwise default to wds1
		cookieContext = "wds1"
		if currentContext != "" && strings.Contains(strings.ToLower(currentContext), "wds") {
			cookieContext = currentContext
		}
	} else {
		// Validate that the cookie context exists in our WDS contexts
		validContext := false
		for _, ctx := range wdsContexts {
			if ctx == cookieContext {
				validContext = true
				break
			}
		}
		if !validContext && len(wdsContexts) > 0 {
			cookieContext = wdsContexts[0] // Fallback to first WDS context
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"ui-wds-context":    cookieContext,
		"system-context":    currentContext,
		"other-wds-context": wdsContexts,
	})
}

// CreateWDSContextUsingCommand creates a new WDS context using Helm SDK
// DOCS: https://github.com/kubestellar/kubestellar/blob/main/docs/content/direct/core-chart.md
func CreateWDSContextUsingHelmSDK(w http.ResponseWriter, r *http.Request, c *gin.Context) {
	newWdsContext := c.Query("context")
	version := c.Query("version")

	if version == "" {
		version = "0.27.2" // default version
	}

	// Set up WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer conn.Close()

	if newWdsContext == "" {
		msg := "context query parameter must be present: ?context=<your_new_context>"
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}

	// Validate kubeconfig and get kubeflex context
	config, err := getKubeConfig()
	if err != nil {
		msg := fmt.Sprintf("failed to load kubeconfig: %v", err)
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}

	var kflexContext string
	for name := range config.Contexts {
		if name == "k3d-kubeflex" || name == "kind-kubeflex" {
			kflexContext = name
			writeMessage(conn, fmt.Sprintf("Using kubeflex context: %s", kflexContext))
			break
		}
	}

	if kflexContext == "" {
		msg := "No kubeflex context (k3d-kubeflex or kind-kubeflex) found in kubeconfig"
		writeMessage(conn, msg)
		return
	}

	releaseName := "add-" + newWdsContext

	// Switch to kubeflex context using kubeconfig
	writeMessage(conn, fmt.Sprintf("Switching to context: %s", kflexContext))
	configAccess := clientcmd.NewDefaultPathOptions()
	configAccess.GlobalFile = clientcmd.RecommendedHomeFile
	configAccess.EnvVar = ""
	if err := clientcmd.ModifyConfig(configAccess, api.Config{
		CurrentContext: kflexContext,
	}, false); err != nil {
		msg := fmt.Sprintf("Failed to switch context: %v", err)
		writeMessage(conn, msg)
		return
	}

	// Initialize Helm action configuration
	settings := cli.New()
	actionConfig := new(action.Configuration)

	// Initialize Helm with kubeconfig context
	if err := actionConfig.Init(settings.RESTClientGetter(), "kubestellar", os.Getenv("HELM_DRIVER"), log.Printf); err != nil {
		writeMessage(conn, fmt.Sprintf("Failed to initialize Helm: %v", err))
		return
	}

	// Prepare Helm install/upgrade action
	client := action.NewUpgrade(actionConfig)
	client.Namespace = "kubestellar"
	client.Version = version
	client.Install = true // Create if not exists

	// Set chart values
	valueOpts := &values.Options{
		ValueFiles: []string{},
		Values:     []string{"kubeflex-operator.install=false", "InstallPCHs=false"},
	}

	vals, err := valueOpts.MergeValues(getter.All(settings))
	if err != nil {
		writeMessage(conn, fmt.Sprintf("Failed to merge values: %v", err))
		return
	}

	// Add WDS configuration
	wdsConfig := map[string]interface{}{
		"WDSes": []map[string]string{{"name": newWdsContext}},
	}
	vals = mergeMaps(vals, wdsConfig)

	// Locate and load the chart
	chartPath := fmt.Sprintf("oci://ghcr.io/kubestellar/kubestellar/core-chart")
	writeMessage(conn, fmt.Sprintf("Pulling chart %s (version: %s)", chartPath, version))

	// Pull the chart
	pull := action.NewPull()
	pull.Version = version
	chartPath, err = pull.Run(chartPath)
	if err != nil {
		writeMessage(conn, fmt.Sprintf("Failed to pull chart: %v", err))
		return
	}

	// Load the chart
	chartRequested, err := loader.Load(chartPath)
	if err != nil {
		writeMessage(conn, fmt.Sprintf("Failed to load chart: %v", err))
		return
	}

	// Run the upgrade/install
	writeMessage(conn, "Starting Helm upgrade/install...")
	release, err := client.RunWithContext(context.Background(), releaseName, chartRequested, vals)
	if err != nil {
		writeMessage(conn, fmt.Sprintf("Helm upgrade failed: %v", err))
		return
	}

	writeMessage(conn, fmt.Sprintf("Helm release %s successfully upgraded/installed in namespace %s\n", release.Name, release.Namespace))

	// Clean up old context if it exists
	writeMessage(conn, fmt.Sprintf("Deleting Kubernetes context '%s' if it exists...", newWdsContext))
	if err := clientcmd.ModifyConfig(configAccess, api.Config{
		Contexts: map[string]*api.Context{newWdsContext: nil},
	}, true); err != nil {
		writeMessage(conn, fmt.Sprintf("Warning: Failed to clean up old context: %v", err))
	}

	// Set up the new context using kflex
	writeMessage(conn, fmt.Sprintf("Setting up context '%s' using kflex...", newWdsContext))
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "kflex", "ctx", "--overwrite-existing-context", newWdsContext)
	output, err := cmd.CombinedOutput()

	if err != nil {
		writeMessage(conn, fmt.Sprintf("Failed to set context using kflex: %v\nOutput: %s", err, string(output)))
		return
	}

	writeMessage(conn, fmt.Sprintf("Context '%s' set up successfully", newWdsContext))
}

// mergeMaps merges multiple maps into one, with later maps taking precedence
func mergeMaps(maps ...map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for _, m := range maps {
		for k, v := range m {
			result[k] = v
		}
	}
	return result
}
