package wds

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
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

// listContexts lists all available contexts in the kubeconfig (Only look for wds context)
func ListContexts() (string, []string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", nil, err
	}
	currentContext := config.CurrentContext
	var contexts []string
	for name := range config.Contexts {
		if strings.Contains(name, "wds") {
			contexts = append(contexts, name)
		}
	}
	return currentContext, contexts, nil
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

func GetWdsContextCookies(c *gin.Context) {
	// currentContext : is system context (may be differnet from wds)
	// TODO: improve this ListContexts function
	currentContext, context, err := ListContexts()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		if strings.Contains("wds", currentContext) {
			cookieContext = currentContext // Default to Kubernetes API context
		} else {
			cookieContext = "wds1"
		}
	}
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
		version = "0.27.2" // newer version
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
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
	for name := range config.Contexts {
		if strings.Contains(name, newWdsContext) {
			msg := fmt.Sprintf("Context: %s is already present", newWdsContext)
			log.Println(msg)
			writeMessage(conn, msg)
			return
		}
	}
	releaseName := "add-" + newWdsContext
	writeMessage(conn, "Context is valid. Proceeding...")
	// Step 0: Switch to "kind-kubeflex" context
	writeMessage(conn, "Switching to kind-kubeflex context")
	flexCmd := exec.Command("kubectl", "config", "use-context", "kind-kubeflex")
	output, err := flexCmd.CombinedOutput()
	if err != nil {
		message := fmt.Sprintf("Failed to execute kubectl command: %v\nOutput: %s", err.Error(), string(output))
		writeMessage(conn, message)
	} else {
		writeMessage(conn, "Successfully switched context to kind-kubeflex\n")
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
	}

	writeMessage(conn, fmt.Sprintf("Helm command executed successfully:\n%s", string(output)))

	writeMessage(conn, fmt.Sprintf("Deleting Kubernetes context '%s' if it exists...", newWdsContext))
	// Step 2: Delete Kubernetes context newContext
	delCtxCmd := exec.Command("kubectl", "config", "delete-context", newWdsContext)
	delCtxOutput, delCtxErr := delCtxCmd.CombinedOutput()

	if delCtxErr != nil {
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
	}

	writeMessage(conn, fmt.Sprintf("Context '%s' set successfully:\n%s\n", newWdsContext, string(kflexOutput)))
	// keep alive
	select {}

}
