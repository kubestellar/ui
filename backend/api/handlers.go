package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/services"
	"github.com/kubestellar/ui/utils"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	clusterStatuses = make(map[string]string)
	mutex           sync.Mutex
)

func OnboardClusterHandler(c *gin.Context) {
	file, err := c.FormFile("kubeconfig")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to retrieve kubeconfig file"})
		return
	}

	clusterName := c.PostForm("name")
	if clusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cluster name is required"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open kubeconfig file"})
		return
	}
	defer f.Close()

	content, err := utils.ReadFileContent(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read kubeconfig file"})
		return
	}

	clusterConfig, err := services.GetClusterConfigByName(content, clusterName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mutex.Lock()
	if status, exists := clusterStatuses[clusterName]; exists {
		mutex.Unlock()
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is already onboarded (status: %s)", clusterName, status)})
		return
	}
	clusterStatuses[clusterName] = "Pending"
	mutex.Unlock()

	go func() {
		if err := services.ValidateClusterConnectivity(clusterConfig); err != nil {
			log.Printf("Cluster '%s' validation failed: %v", clusterName, err)
			mutex.Lock()
			clusterStatuses[clusterName] = "Failed"
			mutex.Unlock()
			return
		}

		mutex.Lock()
		clusterStatuses[clusterName] = "Onboarded"
		mutex.Unlock()

		log.Printf("Cluster '%s' onboarded successfully", clusterName)
	}()

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Cluster '%s' is being onboarded", clusterName)})
}

func GetClusterStatusHandler(c *gin.Context) {
	mutex.Lock()
	defer mutex.Unlock()

	var statuses []models.ClusterStatus
	for cluster, status := range clusterStatuses {
		statuses = append(statuses, models.ClusterStatus{
			ClusterName: cluster,
			Status:      status,
		})
	}

	c.JSON(http.StatusOK, statuses)
}

func ImportClusterHandler(c *gin.Context) {
	var cluster models.Cluster

	if err := c.ShouldBindJSON(&cluster); err != nil {
		log.Printf("Binding error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload", "details": err.Error()})
		return
	}

	if cluster.Name == "" || cluster.Region == "" || cluster.Node == "" {
		log.Printf("Validation error: missing required fields, cluster: %+v", cluster)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required cluster details"})
		return
	}

	services.ImportCluster(cluster)
	c.JSON(http.StatusAccepted, gin.H{"message": "Cluster import initiated"})
}

// kubeconfigPath returns the path to the kubeconfig file.
func kubeconfigPath() string {
	if path := os.Getenv("KUBECONFIG"); path != "" {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		log.Fatalf("Unable to get user home directory: %v", err)
	}
	return fmt.Sprintf("%s/.kube/config", home)
}

func UpdateManagedClusterLabels(contextName, clusterName string, newLabels map[string]string) error {
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return fmt.Errorf("loading kubeconfig: %v", err)
	}

	clientConfig := clientcmd.NewNonInteractiveClientConfig(
		*config,
		contextName,
		&clientcmd.ConfigOverrides{},
		nil,
	)
	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return fmt.Errorf("getting client config: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return fmt.Errorf("creating clientset: %v", err)
	}

	clearLabelsPayload := map[string]interface{}{
		"metadata": map[string]interface{}{
			"labels": map[string]string{},
		},
	}
	clearLabelsBytes, err := json.Marshal(clearLabelsPayload)
	if err != nil {
		return fmt.Errorf("marshaling clear-labels payload: %v", err)
	}

	clearResult := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(clearLabelsBytes).
		Do(context.TODO())

	if err := clearResult.Error(); err != nil {
		return fmt.Errorf("clearing existing labels: %v", err)
	}

	// Step 2: Add the new labels
	newLabelsPayload := map[string]interface{}{
		"metadata": map[string]interface{}{
			"labels": newLabels,
		},
	}
	newLabelsBytes, err := json.Marshal(newLabelsPayload)
	if err != nil {
		return fmt.Errorf("marshaling new-labels payload: %v", err)
	}

	addResult := clientset.RESTClient().Patch(types.MergePatchType).
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		Name(clusterName).
		Body(newLabelsBytes).
		Do(context.TODO())

	if err := addResult.Error(); err != nil {
		return fmt.Errorf("adding new labels: %v", err)
	}

	log.Printf("Replaced labels for managed cluster '%s' in context '%s'", clusterName, contextName)
	return nil
}

func UpdateManagedClusterLabelsHandler(c *gin.Context) {
	var req struct {
		ContextName string            `json:"contextName"`
		ClusterName string            `json:"clusterName"`
		Labels      map[string]string `json:"labels"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	if req.ContextName == "" || req.ClusterName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "contextName and clusterName are required"})
		return
	}

	if err := UpdateManagedClusterLabels(req.ContextName, req.ClusterName, req.Labels); err != nil {
		log.Printf("Error updating labels: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Labels updated successfully"})
}



var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true 
	},
}

type wsRequest struct {
	ClusterName string `json:"clusterName"`
}


func CommandStreamHandler(c *gin.Context) {
	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "💔 WS upgrade failed: " + err.Error()})
		return
	}
	defer conn.Close()

	var req wsRequest
	if err := conn.ReadJSON(&req); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("❌ Invalid payload: "+err.Error()))
		return
	}

	if err := runClusterCommands(conn, req.ClusterName); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\n🛑 "+err.Error()+"\n"))
		return
	}

	conn.WriteMessage(websocket.TextMessage, []byte("\n🎉 Cluster ‘"+req.ClusterName+"’ onboarded successfully!"))
}


func runClusterCommands(conn *websocket.Conn, clusterName string) error {
	conn.WriteMessage(websocket.TextMessage, []byte("🔑 [JOIN] Fetching join token…\n"))
	token, err := fetchClusteradmToken()
	if err != nil {
		return fmt.Errorf("failed to fetch token: %w", err)
	}

	// 2) Run join
	joinCmd := fmt.Sprintf(
		"clusteradm join --hub-token %s --hub-apiserver https://its1.localtest.me:9443 "+
			"--cluster-name %s --force-internal-endpoint-lookup",
		token, clusterName,
	)
	if err := streamSingleCommand(conn, "🔗 [JOIN] ", joinCmd, 2*time.Minute); err != nil {
		return err
	}

	// 3) Run accept
	conn.WriteMessage(websocket.TextMessage, []byte("🤝 [ACCEPT] Running accept command…\n"))
	acceptCmd := fmt.Sprintf(
		"clusteradm accept --context its1 --clusters %s",
		clusterName,
	)
	if err := streamSingleCommand(conn, "🤝 [ACCEPT] ", acceptCmd, 2*time.Minute); err != nil {
		return err
	}

	conn.WriteMessage(websocket.TextMessage, []byte("🤖 [CSR] Auto-approving CSRs…\n"))
	if err := autoApproveCSRs(conn, clusterName); err != nil {
		return err
	}
	conn.WriteMessage(websocket.TextMessage, []byte("✅ [CSR] All matching CSRs approved!\n"))

	return nil
}


func fetchClusteradmToken() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "clusteradm", "--context", "its1", "get", "token")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("clusteradm token failed: %s (output: %s)",
			err, strings.TrimSpace(string(out)))
	}
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "token=") {
			return strings.TrimPrefix(line, "token="), nil
		}
	}
	return "", fmt.Errorf("token not found in output: %s", strings.TrimSpace(string(out)))
}

func autoApproveCSRs(conn *websocket.Conn, clusterName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	cmd := exec.CommandContext(ctx,
		"kubectl", "--context", "its1", "get", "csr", "-o", "json")
	out, err := cmd.Output()
	cancel()
	if err != nil {
		return fmt.Errorf("failed to list CSRs: %w", err)
	}

	var list struct {
		Items []struct {
			Metadata struct{ Name string } `json:"metadata"`
		} `json:"items"`
	}
	if err := json.Unmarshal(out, &list); err != nil {
		return fmt.Errorf("failed to parse CSR list: %w", err)
	}

	approvedAny := false
	for _, item := range list.Items {
		if strings.HasPrefix(item.Metadata.Name, clusterName) {
			conn.WriteMessage(websocket.TextMessage,
				[]byte(fmt.Sprintf("⚙️ [CSR] Approving %s…\n", item.Metadata.Name)))

			aCtx, aCancel := context.WithTimeout(context.Background(), 20*time.Second)
			approveCmd := exec.CommandContext(aCtx,
				"kubectl", "--context", "its1", "certificate", "approve", item.Metadata.Name)
			aOut, aErr := approveCmd.CombinedOutput()
			aCancel()


			conn.WriteMessage(websocket.TextMessage,
				[]byte(fmt.Sprintf("✅ [CSR] Approved %s\n", item.Metadata.Name)))
			approvedAny = true
		}
	}

	if !approvedAny {
		conn.WriteMessage(websocket.TextMessage,
			[]byte("⚠️ [CSR] No matching CSRs found to approve\n"))
	}
	return nil
}


func streamSingleCommand(conn *websocket.Conn, prefix, raw string, timeout time.Duration) error {
	conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("%s→ %s\n", prefix, raw)))

	parts := strings.Fields(raw)
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, parts[0], parts[1:]...)
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("could not start '%s': %w", raw, err)
	}

	stream := func(r io.Reader) {
		buf := make([]byte, 512)
		for {
			n, err := r.Read(buf)
			if n > 0 {
				conn.WriteMessage(websocket.TextMessage, buf[:n])
			}
			if err != nil {
				break
			}
		}
	}
	go stream(stdout)
	go stream(stderr)

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("command '%s' failed: %w", raw, err)
	}

	conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("%s[✓] Done\n", prefix)))
	return nil
}