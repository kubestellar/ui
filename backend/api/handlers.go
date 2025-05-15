package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/models"
	"github.com/kubestellar/ui/services"
	"github.com/kubestellar/ui/utils"
	certv1 "k8s.io/api/certificates/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	clusterStatuses = make(map[string]string)
	mutex           sync.Mutex
	wsUpgrader      = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
)

func getOCMClient(contextName string) (dynamic.Interface, error) {
	config, err := getRestConfig(contextName)
	if err != nil {
		return nil, err
	}
	return dynamic.NewForConfig(config)
}

func getRestConfig(contextName string) (*rest.Config, error) {
	rules := clientcmd.NewDefaultClientConfigLoadingRules()
	overrides := &clientcmd.ConfigOverrides{CurrentContext: contextName}
	return clientcmd.NewNonInteractiveDeferredLoadingClientConfig(rules, overrides).ClientConfig()
}

func getBootstrapToken(contextName string) (string, error) {
	config, err := getRestConfig(contextName)
	if err != nil {
		return "", err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return "", err
	}

	secrets, err := clientset.CoreV1().Secrets("open-cluster-management").List(context.TODO(), metav1.ListOptions{
		LabelSelector: "open-cluster-management.io/clusteradm=true",
	})
	if err != nil {
		return "", fmt.Errorf("failed to list secrets: %w", err)
	}

	for _, secret := range secrets.Items {
		if token, ok := secret.Data["token"]; ok {
			return string(token), nil
		}
	}

	return "", fmt.Errorf("bootstrap token not found")
}

func createManagedCluster(client dynamic.Interface, clusterName string) error {
	managedClusterRes := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	managedCluster := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "cluster.open-cluster-management.io/v1",
			"kind":       "ManagedCluster",
			"metadata": map[string]interface{}{
				"name": clusterName,
			},
			"spec": map[string]interface{}{
				"hubAcceptsClient": false,
			},
		},
	}

	_, err := client.Resource(managedClusterRes).Create(context.TODO(), managedCluster, metav1.CreateOptions{})
	if errors.IsAlreadyExists(err) {
		log.Printf("ManagedCluster %s already exists", clusterName)
		return nil
	}
	return err
}

func acceptManagedCluster(client dynamic.Interface, clusterName string) error {
	managedClusterRes := schema.GroupVersionResource{
		Group:    "cluster.open-cluster-management.io",
		Version:  "v1",
		Resource: "managedclusters",
	}

	patch := []byte(`{"spec":{"hubAcceptsClient": true}}`)
	_, err := client.Resource(managedClusterRes).Patch(
		context.TODO(),
		clusterName,
		types.MergePatchType,
		patch,
		metav1.PatchOptions{},
	)
	return err
}

func approveCSR(contextName string, csrName string) error {
	config, err := getRestConfig(contextName)
	if err != nil {
		return err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	csr, err := clientset.CertificatesV1().CertificateSigningRequests().Get(context.TODO(), csrName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	approval := certv1.CertificateSigningRequestCondition{
		Type:    certv1.CertificateApproved,
		Status:  corev1.ConditionTrue,
		Reason:  "KubestellarApproved",
		Message: "Approved by Kubestellar UI",
	}

	csr.Status.Conditions = append(csr.Status.Conditions, approval)
	_, err = clientset.CertificatesV1().CertificateSigningRequests().UpdateApproval(
		context.TODO(),
		csrName,
		csr,
		metav1.UpdateOptions{},
	)
	return err
}

func CommandStreamHandler(c *gin.Context) {
	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "WebSocket upgrade failed: " + err.Error()})
		return
	}
	defer conn.Close()

	var req struct {
		ClusterName string `json:"clusterName"`
	}
	if err := conn.ReadJSON(&req); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("❌ Invalid payload: "+err.Error()))
		return
	}

	if err := onboardCluster(conn, req.ClusterName); err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\n🛑 "+err.Error()+"\n"))
		return
	}

	conn.WriteMessage(websocket.TextMessage, []byte("\n🎉 Cluster ‘"+req.ClusterName+"’ onboarded successfully!"))
}

func onboardCluster(conn *websocket.Conn, clusterName string) error {
	hubClient, err := getOCMClient("its1")
	if err != nil {
		return fmt.Errorf("failed to create OCM client: %w", err)
	}

	sendProgress(conn, "🔑 [JOIN]", "Creating ManagedCluster resource")
	if err := createManagedCluster(hubClient, clusterName); err != nil {
		return fmt.Errorf("failed to create ManagedCluster: %w", err)
	}

	sendProgress(conn, "🤝 [ACCEPT]", "Accepting cluster on hub")
	if err := acceptManagedCluster(hubClient, clusterName); err != nil {
		return fmt.Errorf("failed to accept cluster: %w", err)
	}

	sendProgress(conn, "🤖 [CSR]", "Searching for pending CSRs")
	if err := processCSRs(conn, clusterName); err != nil {
		return fmt.Errorf("failed processing CSRs: %w", err)
	}

	return nil
}

func processCSRs(conn *websocket.Conn, clusterName string) error {
	config, err := getRestConfig("its1")
	if err != nil {
		return err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	csrs, err := clientset.CertificatesV1().CertificateSigningRequests().List(context.TODO(), metav1.ListOptions{
		FieldSelector: "spec.signerName=kubernetes.io/kube-apiserver-client",
	})
	if err != nil {
		return err
	}

	approved := 0
	for _, csr := range csrs.Items {
		if strings.HasPrefix(csr.Name, clusterName) && isCSRPending(csr) {
			sendProgress(conn, "⚙️ [CSR]", fmt.Sprintf("Approving %s", csr.Name))
			if err := approveCSR("its1", csr.Name); err != nil {
				return fmt.Errorf("failed to approve CSR %s: %w", csr.Name, err)
			}
			approved++
		}
	}

	if approved == 0 {
		sendProgress(conn, "⚠️ [CSR]", "No pending CSRs found")
	}
	return nil
}

func isCSRPending(csr certv1.CertificateSigningRequest) bool {
	for _, cond := range csr.Status.Conditions {
		if cond.Type == certv1.CertificateApproved {
			return false
		}
	}
	return true
}

func sendProgress(conn *websocket.Conn, prefix string, message string) {
	fullMsg := fmt.Sprintf("%s %s\n", prefix, message)
	conn.WriteMessage(websocket.TextMessage, []byte(fullMsg))
}

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
