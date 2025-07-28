package wds

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/backend/telemetry"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
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

// ListContexts lists all available contexts in the kubeconfig and filters for WDS contexts.
func ListContexts() (string, []string, error) {
	// Load the kubeconfig
	config, err := getKubeConfig()
	if err != nil {
		return "", nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Get the current context
	currentContext := config.CurrentContext

	// Filter contexts that contain "wds"
	var wdsContexts []string
	for name, _ := range config.Contexts {
		if strings.Contains(name, "wds") {
			wdsContexts = append(wdsContexts, name)
		}
	}

	// Check if no WDS contexts were found
	if len(wdsContexts) == 0 {
		log.Println("No WDS contexts found in kubeconfig")
		return currentContext, nil, fmt.Errorf("no WDS contexts found in kubeconfig")
	}

	// Log the found contexts for debugging
	log.Printf("Current context: %s", currentContext)
	log.Printf("Available WDS contexts: %v", wdsContexts)

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
	startTime := time.Now()
	if err := c.ShouldBindJSON(&request); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/wds/context", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	_, context, err := ListContexts()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/wds/context", "500").Inc()
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
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/wds/context", "404").Inc()
		msg := fmt.Sprintf("no context with %s present", request.Context)
		c.JSON(http.StatusOK, gin.H{
			"error":   msg,
			"message": "Please create context first",
		})
		return
	}
	c.SetCookie("ui-wds-context", request.Context, 3600, "/", "", false, true)
	msg := fmt.Sprintf("switched to %s context", request.Context)
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/wds/context", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("POST", "/wds/context").Observe(time.Since(startTime).Seconds())
	c.JSON(http.StatusOK, gin.H{
		"message":            msg,
		"current-ui-context": request.Context,
	})
}

func GetWdsContextCookies(c *gin.Context) {
	// currentContext : is system context (may be differnet from wds)
	// TODO: improve this ListContexts function
	startTime := time.Now()
	currentContext, context, err := ListContexts()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/wds/context", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/wds/context", "400").Inc()
		if strings.Contains("wds", currentContext) {
			cookieContext = currentContext // Default to Kubernetes API context
		} else {
			cookieContext = "wds1"
		}
	}
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/wds/context", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/wds/context").Observe(time.Since(startTime).Seconds())
	c.JSON(http.StatusOK, gin.H{
		"ui-wds-context":    cookieContext,
		"system-context":    currentContext,
		"other-wds-context": context,
	})
}

// CreateWDSContextUsingCommand TODO: Replicate this using the helm go-sdk
// DOCS: https://github.com/kubestellar/kubestellar/blob/main/docs/content/direct/core-chart.md
func CreateWDSContextUsingCommand(w http.ResponseWriter, r *http.Request, c *gin.Context) {
	newWdsContext := c.Query("context")
	version := c.Query("version")

	if version == "" {
		version = "0.27.2"
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		telemetry.WebsocketConnectionsFailed.WithLabelValues("create-wds-context", "upgrade_error").Inc()
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	telemetry.WebsocketConnectionUpgradedSuccess.WithLabelValues("create-wds-context", "upgrade_success").Inc()
	defer conn.Close()
	if newWdsContext == "" {
		msg := "context query must be present ?context=<your_new_context>"
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}
	// Checking is that wds context is present or not
	config, err := getKubeConfig()
	if err != nil {
		msg := "failed to load the kubeconfig"
		log.Println(msg)
		writeMessage(conn, msg)
		return
	}
	var kindCtx, k3dCtx string
	for name := range config.Contexts {
		if name == "k3d-kubeflex" {
			k3dCtx = name
			fmt.Println("We choose k3d-kubeflex context")
		} else if name == "kind-kubeflex" {
			kindCtx = name
		}
	}
	if k3dCtx == "" && kindCtx == "" {
		writeMessage(conn, "No kubeflex detected for kind, k3d type cluster, Please check is you have k3d-kubeflex or kind-kubeflex")
		return
	}
	releaseName := "add-" + newWdsContext
	writeMessage(conn, "Context is valid. Proceeding...")

	kflexContextType := k3dCtx
	if kflexContextType == "" {
		kflexContextType = kindCtx
	}

	fmt.Printf("Detected cluster type: %s\n", kflexContextType)

	// Step 0: Switch to "kind-kubeflex" or "k3d-kubeflex" context
	message := fmt.Sprintf("Switching to %s context", kflexContextType)
	writeMessage(conn, message)
	flexCmd := exec.Command("kubectl", "config", "use-context", kflexContextType)
	output, err := flexCmd.CombinedOutput()
	if err != nil {
		telemetry.InstrumentKubectlCommand(flexCmd, "create-wds-context", kflexContextType)
		message := fmt.Sprintf("Failed to execute kubectl command: %v\nOutput: %s", err.Error(), string(output))
		writeMessage(conn, message)
		return
	} else {
		message := fmt.Sprintf("Successfully switched context to %s\n", kflexContextType)
		writeMessage(conn, message)
	}
	writeMessage(conn, "Starting upgrade --install for helm chart")

	// Step 1: Helm upgrade command
	helmCmd := "helm"
	args := []string{
		"upgrade", "--install", releaseName,
		"oci://ghcr.io/kubestellar/kubestellar/core-chart",
		"--version", version,
		"--set", "kubeflex-operator.install=false,InstallPCHs=false",
		"--set-json", fmt.Sprintf(`WDSes=[{"name":"%s"}]`, newWdsContext),
	}
	writeMessage(conn, "Running Helm upgrade...")
	// Execute the command
	cmd := exec.Command(helmCmd, args...)
	output, err = cmd.CombinedOutput()

	if err != nil {
		message := fmt.Sprintf("Failed to execute Helm command: %v\n%s", err.Error(), string(output))
		writeMessage(conn, message)
		return
	}

	writeMessage(conn, fmt.Sprintf("Helm command executed successfully:\n%s", string(output)))

	writeMessage(conn, fmt.Sprintf("Deleting Kubernetes context '%s' if it exists...", newWdsContext))
	// Step 2: Delete Kubernetes context newContext
	delCtxCmd := exec.Command("kubectl", "config", "delete-context", newWdsContext)
	delCtxOutput, delCtxErr := delCtxCmd.CombinedOutput()

	if delCtxErr != nil {
		telemetry.InstrumentKubectlCommand(delCtxCmd, "delete-wds-context", newWdsContext)
		writeMessage(conn, fmt.Sprintf("Warning: Failed to delete context '%s' (may not exist): %v\nOutput: %s", newWdsContext, delCtxErr, string(delCtxOutput)))
	} else {
		writeMessage(conn, fmt.Sprintf("Deleted context '%s' successfully", newWdsContext))
	}
	writeMessage(conn, fmt.Sprintf("Setting context '%s' using kflex...", newWdsContext))
	// Step 3: Set the new context using kflex
	kflexCmd := exec.Command("kflex", "ctx", "--overwrite-existing-context", newWdsContext)
	kflexOutput, kflexErr := kflexCmd.CombinedOutput()

	if kflexErr != nil {
		writeMessage(conn, fmt.Sprintf("Failed to set context using kflex: %v\nOutput: %s", kflexErr, string(kflexOutput)))
		return
	}

	writeMessage(conn, fmt.Sprintf("Context '%s' set successfully:\n%s\n", newWdsContext, string(kflexOutput)))

}
