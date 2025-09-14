package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/telemetry"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// ---------------------------
// Data Structures
// ---------------------------

// Request only takes api_url and optional token
type ImportByURLRequest struct {
	APIURL string `json:"api_url" binding:"required,url"`
	Token  string `json:"token"`
}

// ManagedClusterInfo holds details about a managed (imported) cluster.
type ManagedClusterInfo struct {
	Name         string            `json:"name"`
	Labels       map[string]string `json:"labels"`
	CreationTime time.Time         `json:"creationTime"`
	Context      string            `json:"context,omitempty"`
}

// ContextInfo holds basic info for a kubeconfig context.
type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

// ClusterDetails holds detailed information about a cluster.
type ClusterDetails struct {
	ClusterName        string               `json:"clusterName"`
	Contexts           []ContextInfo        `json:"contexts"`
	ITSManagedClusters []ManagedClusterInfo `json:"itsManagedClusters"`
}

// ---------------------------
// Utility Functions
// ---------------------------

// HomeDir returns the user's home directory.
func HomeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // for Windows
}

func kubeconfigPath() string {
	if path := os.Getenv("KUBECONFIG"); path != "" {
		return path
	}
	return fmt.Sprintf("%s/.kube/config", HomeDir())
}

func GetITSInfo() ([]ManagedClusterInfo, error) {
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	var managedClusters []ManagedClusterInfo

	// Check all contexts that might be hub clusters
	for contextName := range config.Contexts {
		if !strings.HasPrefix(contextName, "its") {
			continue
		}

		clientConfig := clientcmd.NewNonInteractiveClientConfig(
			*config,
			contextName,
			&clientcmd.ConfigOverrides{},
			nil,
		)

		restConfig, err := clientConfig.ClientConfig()
		if err != nil {
			log.Printf("Skipping context %s: %v", contextName, err)
			continue
		}

		clientset, err := kubernetes.NewForConfig(restConfig)
		if err != nil {
			log.Printf("Error creating clientset for %s: %v", contextName, err)
			continue
		}

		clustersBytes, err := clientset.RESTClient().Get().
			AbsPath("/apis/cluster.open-cluster-management.io/v1").
			Resource("managedclusters").
			DoRaw(context.TODO())

		if err != nil {
			log.Printf("Error fetching clusters from %s: %v", contextName, err)
			continue
		}

		var clusterList struct {
			Items []struct {
				Metadata struct {
					Name              string            `json:"name"`
					Labels            map[string]string `json:"labels"`
					CreationTimestamp string            `json:"creationTimestamp"`
				} `json:"metadata"`
			} `json:"items"`
		}

		if err := json.Unmarshal(clustersBytes, &clusterList); err != nil {
			log.Printf("Error unmarshaling clusters: %v", err)
			continue
		}

		for _, item := range clusterList.Items {
			creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
			managedClusters = append(managedClusters, ManagedClusterInfo{
				Name:         item.Metadata.Name,
				Labels:       item.Metadata.Labels,
				CreationTime: creationTime,
				Context:      contextName,
			})
		}
	}

	return managedClusters, nil
}

// GetAvailableClusters reads the kubeconfig and returns a slice of ContextInfo
// for clusters that do NOT match the "*-kubeflex" pattern and are not already imported into ITS.
// It normalizes the underlying cluster name (stripping "k3d-" prefix) before filtering.
// GetAvailableClusters reads the kubeconfig and returns available clusters
func GetAvailableClusters() ([]ContextInfo, error) {
	kubeconfig := kubeconfigPath()
	log.Printf("Using kubeconfig: %s", kubeconfig)

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	// Get managed clusters from OCM
	managedClusters, err := GetITSInfo()
	if err != nil {
		log.Printf("Error retrieving managed clusters: %v", err)
		managedClusters = []ManagedClusterInfo{}
	}

	// Build lookup map with multiple variations
	managedSet := make(map[string]bool)
	for _, mc := range managedClusters {
		baseName := strings.ToLower(mc.Name)
		managedSet[baseName] = true

		// Add common prefix variations to the managed set
		managedSet["k3d-"+baseName] = true
		managedSet["kind-"+baseName] = true
		managedSet[strings.ToLower(mc.Name+"-kubeflex")] = true
	}

	var available []ContextInfo
	for ctxName, ctx := range config.Contexts {
		lowerCtxName := strings.ToLower(ctxName)
		lowerCluster := strings.ToLower(ctx.Cluster)

		// Skip system contexts
		if strings.HasPrefix(lowerCtxName, "its") ||
			strings.HasPrefix(lowerCtxName, "wds") ||
			strings.HasPrefix(lowerCtxName, "ar") {
			continue
		}

		// Check all possible naming variations
		if managedSet[lowerCtxName] ||
			managedSet[lowerCluster] ||
			managedSet[strings.TrimPrefix(lowerCluster, "k3d-")] ||
			managedSet[strings.TrimPrefix(lowerCluster, "kind-")] {
			continue
		}

		available = append(available, ContextInfo{
			Name:    ctxName,
			Cluster: ctx.Cluster,
		})
	}

	return available, nil
}

// GetAvailableClustersHandler handles the GET /api/cluster/available endpoint.
// It returns a filtered list of available clusters (contexts) from the kubeconfig.
func GetAvailableClustersHandler(c *gin.Context) {
	startTime := time.Now()
	available, err := GetAvailableClusters()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/clusters/available", "500").Inc()
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/clusters/available", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/api/clusters/available").Observe(time.Since(startTime).Seconds())
	c.JSON(http.StatusOK, available)
}

// GetKubeInfoHandler handles the GET /api/clusters endpoint.
// It returns detailed information including contexts, a unique list of clusters,
// the current kubeconfig context, and ITS managed cluster data.
func GetKubeInfoHandler(c *gin.Context) {
	contexts, clusters, currentContext, err, itsData := GetKubeInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"contexts":       contexts,
		"clusters":       clusters,
		"currentContext": currentContext,
		"itsData":        itsData,
	})
}

// GetKubeInfo collects detailed kubeconfig information:
// - ITS contexts (e.g., those starting with "its")
// - Unique cluster names (from contexts ending with "-kubeflex")
// - The current kubeconfig context
// - ITS managed cluster data
func GetKubeInfo() ([]ContextInfo, []string, string, error, []ManagedClusterInfo) {
	kubeconfig := kubeconfigPath()
	// Log which kubeconfig is being used.
	if os.Getenv("KUBECONFIG") == "" {
		log.Printf("Using default kubeconfig path: %s", kubeconfig)
	} else {
		log.Printf("Using kubeconfig from environment: %s", kubeconfig)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, "", err, nil
	}

	var contexts []ContextInfo
	clusterSet := make(map[string]bool)
	currentContext := config.CurrentContext
	var managedClusters []ManagedClusterInfo

	// Process ITS contexts (e.g., contexts starting with "its")
	for contextName := range config.Contexts {
		if strings.HasPrefix(contextName, "its") {
			log.Printf("Processing ITS context: %s", contextName)
			clientConfig := clientcmd.NewNonInteractiveClientConfig(
				*config,
				contextName,
				&clientcmd.ConfigOverrides{},
				clientcmd.NewDefaultClientConfigLoadingRules(),
			)
			restConfig, err := clientConfig.ClientConfig()
			if err != nil {
				log.Printf("Error creating REST config for context %s: %v", contextName, err)
				continue
			}
			clientset, err := kubernetes.NewForConfig(restConfig)
			if err != nil {
				log.Printf("Error creating clientset for context %s: %v", contextName, err)
				continue
			}
			clustersBytes, err := clientset.RESTClient().Get().
				AbsPath("/apis/cluster.open-cluster-management.io/v1").
				Resource("managedclusters").
				DoRaw(context.TODO())
			if err != nil {
				log.Printf("Error fetching managed clusters from context %s: %v", contextName, err)
				continue
			}
			var clusterList struct {
				Items []struct {
					Metadata struct {
						Name              string            `json:"name"`
						Labels            map[string]string `json:"labels"`
						CreationTimestamp string            `json:"creationTimestamp"`
					} `json:"metadata"`
				} `json:"items"`
			}
			if err := json.Unmarshal(clustersBytes, &clusterList); err != nil {
				log.Printf("Error unmarshaling clusters from context %s: %v", contextName, err)
				continue
			}
			for _, item := range clusterList.Items {
				creationTime, _ := time.Parse(time.RFC3339, item.Metadata.CreationTimestamp)
				managedClusters = append(managedClusters, ManagedClusterInfo{
					Name:         item.Metadata.Name,
					Labels:       item.Metadata.Labels,
					CreationTime: creationTime,
					Context:      contextName,
				})
			}
		}
	}

	// Process contexts with "-kubeflex" suffix.
	for contextName, ctx := range config.Contexts {
		if strings.HasSuffix(contextName, "-kubeflex") {
			contexts = append(contexts, ContextInfo{
				Name:    contextName,
				Cluster: ctx.Cluster,
			})
			clusterSet[ctx.Cluster] = true
		}
	}

	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}

	return contexts, clusters, currentContext, nil, managedClusters
}

func ImportClusterHandler(c *gin.Context) {
	file, err := c.FormFile("kubeconfig")
	startTime := time.Now()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "kubeconfig file is required"})
		return
	}

	src, err := file.Open()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open uploaded file"})
		return
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file contents"})
		return
	}

	// 2. Load kubeconfig
	cfg, err := clientcmd.Load(data)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid kubeconfig format"})
		return
	}

	adjustClusterServerEndpoints(cfg)

	tmpPath := filepath.Join(os.TempDir(), fmt.Sprintf("import-%d.kubeconfig", time.Now().UnixNano()))
	outData, err := clientcmd.Write(*cfg)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to serialize kubeconfig"})
		return
	}
	if err := os.WriteFile(tmpPath, outData, 0600); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write temp kubeconfig"})
		return
	}

	hubKube := os.Getenv("HUB_BOOTSTRAP_KUBECONFIG")
	if hubKube == "" {
		hubKube = filepath.Join(os.Getenv("HOME"), ".kube", "bootstrap.kubeconfig")
	}

	exec.Command("helm", "repo", "add", "ocm", "https://open-cluster-management.io/helm-charts").Run()
	exec.Command("helm", "repo", "update").Run()

	releaseName := fmt.Sprintf("klusterlet-%s", strings.ReplaceAll(cfg.CurrentContext, "_", "-"))

	cmd := exec.Command("helm", "upgrade", "--install",
		releaseName, "ocm/klusterlet",
		"--kubeconfig", tmpPath,
		"--namespace", "open-cluster-management",
		"--create-namespace",
		"--set", fmt.Sprintf("hubKubeconfig=%s", hubKube),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("helm install failed: %s", string(output))})
		return
	}
	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/clusters/import", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("POST", "/clusters/import").Observe(time.Since(startTime).Seconds())
	c.JSON(http.StatusOK, gin.H{
		"message":     "Cluster import initiated",
		"release":     releaseName,
		"helm_output": string(output),
	})
}

func ImportClusterByURLHandler(c *gin.Context) {
	startTime := time.Now()

	var req ImportByURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import-by-url", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: api_url required and must be a valid URL"})
		return
	}

	// Optional: block private/internal hosts to avoid SSRF
	// if hostIsPrivate(req.APIURL) {
	// 	telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import-by-url", "400").Inc()
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "api_url resolves to internal/private IP"})
	// 	return
	// }

	// derive context name
	ctxName := deriveSafeNameFromURL(req.APIURL)

	// build minimal kubeconfig
	cfg := clientcmdapi.NewConfig()
	cluster := clientcmdapi.NewCluster()
	cluster.Server = req.APIURL

	authInfo := clientcmdapi.NewAuthInfo()
	if req.Token != "" {
		authInfo.Token = req.Token
	}

	cfg.Clusters[ctxName] = cluster
	cfg.AuthInfos[ctxName] = authInfo
	cfg.Contexts[ctxName] = &clientcmdapi.Context{
		Cluster:  ctxName,
		AuthInfo: ctxName,
	}
	cfg.CurrentContext = ctxName

	// write temp kubeconfig
	tmpPath, err := writeTempKubeconfig(cfg)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import-by-url", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write temp kubeconfig"})
		return
	}
	defer os.Remove(tmpPath)

	// validate cluster reachable with provided creds
	if out, err := exec.Command("kubectl", "--kubeconfig", tmpPath, "get", "--raw", "/healthz").CombinedOutput(); err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import-by-url", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "failed to reach cluster with provided credentials",
			"detail": string(out),
		})
		return
	}

	// helm install (same flow as your kubeconfig-based handler)
	releaseName := fmt.Sprintf("klusterlet-%s", sanitizeName(ctxName))
	exec.Command("helm", "repo", "add", "ocm", "https://open-cluster-management.io/helm-charts").Run()
	exec.Command("helm", "repo", "update").Run()

	cmd := exec.Command("helm", "upgrade", "--install",
		releaseName, "ocm/klusterlet",
		"--kubeconfig", tmpPath,
		"--namespace", "open-cluster-management",
		"--create-namespace",
		"--set", fmt.Sprintf("hubKubeconfig=%s", os.Getenv("HUB_BOOTSTRAP_KUBECONFIG")),
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("POST", "/clusters/import-by-url", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("helm install failed: %s", string(output))})
		return
	}

	telemetry.TotalHTTPRequests.WithLabelValues("POST", "/clusters/import-by-url", "200").Inc()
	telemetry.HTTPRequestDuration.WithLabelValues("POST", "/clusters/import-by-url").Observe(time.Since(startTime).Seconds())

	c.JSON(http.StatusOK, gin.H{
		"message":     "Cluster import initiated",
		"release":     releaseName,
		"helm_output": string(output),
	})
}

// helpers (same as earlier, kept minimal)
func writeTempKubeconfig(cfg *clientcmdapi.Config) (string, error) {
	outData, err := clientcmd.Write(*cfg)
	if err != nil {
		return "", err
	}
	tmpPath := filepath.Join(os.TempDir(), fmt.Sprintf("import-%d.kubeconfig", time.Now().UnixNano()))
	if err := os.WriteFile(tmpPath, outData, 0600); err != nil {
		return "", err
	}
	return tmpPath, nil
}

func sanitizeName(s string) string {
	re := regexp.MustCompile(`[^a-zA-Z0-9\-]`)
	out := re.ReplaceAllString(s, "-")
	out = strings.Trim(out, "-")
	if out == "" {
		out = "cluster"
	}
	if len(out) > 40 {
		out = out[:40]
	}
	return strings.ToLower(out)
}

func deriveSafeNameFromURL(urlStr string) string {
	s := strings.TrimPrefix(urlStr, "https://")
	s = strings.TrimPrefix(s, "http://")
	s = strings.SplitN(s, "/", 2)[0]
	return sanitizeName(s)
}

// very small SSRF mitigation: resolve host and reject private IPs
func hostIsPrivate(rawURL string) bool {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return true
	}
	host := parsed.Host
	// strip possible port
	h, _, err := net.SplitHostPort(host)
	if err == nil {
		host = h
	}
	ips, err := net.LookupIP(host)
	if err != nil {
		// if we can't resolve, play safe and reject
		return true
	}
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
			return true
		}
	}
	return false
}

func adjustClusterServerEndpoints(config *clientcmdapi.Config) {
	for name, cluster := range config.Clusters {

		if strings.Contains(cluster.Server, "localhost") {
			cluster.Server = strings.Replace(cluster.Server, "localhost", fmt.Sprintf("%s", name), 1)
		}
	}
}

func GetClusterDetailsHandler(c *gin.Context) {
	clusterName := c.Param("name")
	startTime := time.Now()
	if strings.TrimSpace(clusterName) == "" {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/cluster/details/:name", "400").Inc()
		c.JSON(http.StatusBadRequest, gin.H{"error": "cluster name is required"})
		return
	}

	// Load the kubeconfig.
	kubeconfig := kubeconfigPath()
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/cluster/details/:name", "500").Inc()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load kubeconfig: " + err.Error()})
		return
	}

	var contexts []ContextInfo
	// Check all kubeconfig contexts for a matching cluster.
	for ctxName, ctx := range config.Contexts {
		if strings.EqualFold(ctx.Cluster, clusterName) {
			contexts = append(contexts, ContextInfo{
				Name:    ctxName,
				Cluster: ctx.Cluster,
			})
		}
	}

	// Retrieve ITS-managed cluster information.
	itsData, err := GetITSInfo()
	if err != nil {
		itsData = []ManagedClusterInfo{}
	}

	var itsManagedClusters []ManagedClusterInfo
	// Filter ITS data using a case-insensitive match on the cluster name.
	for _, mc := range itsData {
		if strings.EqualFold(mc.Name, clusterName) {
			itsManagedClusters = append(itsManagedClusters, mc)
		}
	}

	// Return 404 if no details are found in both kubeconfig and ITS.
	if len(contexts) == 0 && len(itsManagedClusters) == 0 {
		telemetry.HTTPErrorCounter.WithLabelValues("GET", "/api/cluster/details/:name", "404").Inc()
		c.JSON(http.StatusNotFound, gin.H{"error": "cluster not found"})
		return
	}

	response := ClusterDetails{
		ClusterName:        clusterName,
		Contexts:           contexts,
		ITSManagedClusters: itsManagedClusters,
	}
	telemetry.HTTPRequestDuration.WithLabelValues("GET", "/api/cluster/details/:name").Observe(time.Since(startTime).Seconds())
	telemetry.TotalHTTPRequests.WithLabelValues("GET", "/api/cluster/details/:name", "200").Inc()
	c.JSON(http.StatusOK, response)
}
