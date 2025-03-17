package wds

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"os"
	"os/exec"

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

// listContexts lists all available contexts in the kubeconfig
func ListContexts() (string, []string, error) {
	config, err := getKubeConfig()
	if err != nil {
		return "", nil, err
	}
	currentContext := config.CurrentContext
	var contexts []string
	for name := range config.Contexts {
		contexts = append(contexts, name)
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
func CreateWDSContextUsingCommand(w http.ResponseWriter, r *http.Request, c *gin.Context) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}

	defer conn.Close()
	// Step 0: Switch to "kind-kubeflex" context
	writeMessage(conn, "Switching to kind-kubeflex context")
	// TODO: Test this SwitchKubeConfigContext is it working or not
	_, err = SwitchKubeConfigContext("kind-kubeflex")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Failed to create Kubernetes clientset",
			"error":   err.Error(),
		})
		return
	}

	writeMessage(conn, "Starting upgrade --install for helm chart")

	// Step 1: Helm upgrade command
	helmCmd := "helm"
	args := []string{
		"upgrade", "--install", "add-wds6",
		"oci://ghcr.io/kubestellar/kubestellar/core-chart",
		"--version", "0.25.0-rc.1",
		"--set", "kubeflex-operator.install=false,InstallPCHs=false",
		"--set-json", `WDSes=[{"name":"wds6"}]`,
	}
	writeMessage(conn, "Running Helm upgrade...")
	// Execute the command
	cmd := exec.Command(helmCmd, args...)
	output, err := cmd.CombinedOutput()

	if err != nil {
		message := fmt.Sprintf("Failed to execute Helm command: %v\n%s", err.Error(), string(output))
		writeMessage(conn, message)
	}

	writeMessage(conn, fmt.Sprintf("Helm command executed successfully:\n%s", string(output)))

	writeMessage(conn, "Deleting Kubernetes context 'wds6' if it exists...")
	// Step 2: Delete Kubernetes context wds6
	delCtxCmd := exec.Command("kubectl", "config", "delete-context", "wds6")
	delCtxOutput, delCtxErr := delCtxCmd.CombinedOutput()

	if delCtxErr != nil {
		writeMessage(conn, fmt.Sprintf("Warning: Failed to delete context 'wds3' (may not exist): %v\nOutput: %s", delCtxErr, string(delCtxOutput)))
	} else {
		if err := conn.WriteMessage(websocket.TextMessage, []byte("Deleted context 'wds6' successfully.")); err != nil {
			log.Println("Error writing to WebSocket:", err)
			return
		}
		writeMessage(conn, "Deleted context 'wds6' successfully.")
	}
	writeMessage(conn, "Setting context 'wds6' using kflex...")
	// Step 3: Set the new context using kflex
	kflexCmd := exec.Command("kflex", "ctx", "wds6")
	kflexOutput, kflexErr := kflexCmd.CombinedOutput()

	if kflexErr != nil {
		writeMessage(conn, fmt.Sprintf("Failed to set context using kflex: %v\nOutput: %s", kflexErr, string(kflexOutput)))
	}

	writeMessage(conn, fmt.Sprintf("Context 'wds6' set successfully:\n%s\n", string(kflexOutput)))
	// keep alive
	select {}

}

func SwitchKubeConfigContext(newContext string) (*kubernetes.Clientset, error) {
	config, err := getKubeConfig()
	if err != nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load kubeconfig"})
		return nil, fmt.Errorf("failed to load kubeconfig")
	}

	// Check if the context exists
	if _, exists := config.Contexts[newContext]; !exists {
		return nil, fmt.Errorf("context %s not found", newContext)
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts[newContext]
	if ctxContext == nil {
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create ctxConfig"})
		return nil, fmt.Errorf("failed to create ctxConfig")
	}

	// Create config for WDS cluster
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: newContext, // wds1, wds2
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
