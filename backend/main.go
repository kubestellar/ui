package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/katamyra/kubestellarUI/wds"
	"k8s.io/client-go/informers"

	"github.com/gin-gonic/gin"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/katamyra/kubestellarUI/api"
	nsresources "github.com/katamyra/kubestellarUI/namespace/resources"
	"github.com/katamyra/kubestellarUI/wds/bp"
	"github.com/katamyra/kubestellarUI/wds/deployment"
	"github.com/katamyra/kubestellarUI/wds/resources"
	"go.uber.org/zap"
)

type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

type ManagedClusterInfo struct {
	Name         string            `json:"name"`
	Labels       map[string]string `json:"labels"`
	CreationTime time.Time         `json:"creationTime"`
	Context      string            `json:"context"`
}

func main() {

	initLogger()
	router := gin.Default()

	router.Use(ZapMiddleware())
	log.Println("Debug: KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/api/clusters", func(c *gin.Context) {
		contexts, clusters, currentContext, err, itsData := getKubeInfo()
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
	})

	router.POST("/clusters/onboard", api.OnboardClusterHandler)
	router.GET("/clusters/status", api.GetClusterStatusHandler)

	router.GET("/api/wds/workloads", func(c *gin.Context) {
		workloads, err := deployment.GetWDSWorkloads()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, workloads)
	})

	// New Log Endpoint
	router.GET("/api/log", func(c *gin.Context) {
		// Fetch Kubernetes Information
		contexts, clusters, currentContext, _, itsData := getKubeInfo()

		// Fetch WDS Workloads
		workloads, err := deployment.GetWDSWorkloads()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		var logBuilder strings.Builder

		logBuilder.WriteString("==== KubestellarUI Log ====\n\n")

		logBuilder.WriteString(fmt.Sprintf("Current Context: %s\n\n", currentContext))

		logBuilder.WriteString("=== Clusters ===\n")
		for _, cluster := range clusters {
			logBuilder.WriteString(fmt.Sprintf("- %s\n", cluster))
		}

		logBuilder.WriteString("\n=== Contexts ===\n")
		for _, ctx := range contexts {
			logBuilder.WriteString(fmt.Sprintf("- %s (Cluster: %s)\n", ctx.Name, ctx.Cluster))
		}

		logBuilder.WriteString("\n=== ITS Data ===\n")
		for _, cluster := range itsData {
			logBuilder.WriteString(fmt.Sprintf("- Name: %s\n", cluster.Name))
			logBuilder.WriteString("  Labels:\n")
			for key, value := range cluster.Labels {
				logBuilder.WriteString(fmt.Sprintf("    %s=%s\n", key, value))
			}
			logBuilder.WriteString(fmt.Sprintf("  Creation Time: %s\n", cluster.CreationTime))
		}

		logBuilder.WriteString("\n=== WDS Workloads ===\n")
		for _, workload := range workloads {
			logBuilder.WriteString(fmt.Sprintf("- Name: %s\n", workload.Name))
			logBuilder.WriteString(fmt.Sprintf("  Kind: %s\n", workload.Kind))
			logBuilder.WriteString(fmt.Sprintf("  Namespace: %s\n", workload.Namespace))
			logBuilder.WriteString(fmt.Sprintf("  Creation Time: %s\n\n", workload.CreationTime))
		}

		// Set Headers for File Download
		c.Header("Content-Type", "text/plain")
		c.Header("Content-Disposition", "attachment; filename=kubestellarui.log")

		// Send the Log String
		c.String(http.StatusOK, logBuilder.String())
	})

	// Route to CRUD deployment
	router.POST("/api/wds/create", deployment.CreateDeployment)
	router.POST("/api/wds/create/json", deployment.HandleCreateDeploymentJson)
	router.PUT("/api/wds/update", deployment.UpdateDeployment)
	router.DELETE("/api/wds/delete", deployment.DeleteDeployment)
	router.GET("/api/wds/:name", deployment.GetDeploymentByName)
	router.GET("/api/wds/status", deployment.GetDeploymentStatus)
	// websocket
	router.GET("/ws", func(ctx *gin.Context) {
		deployment.HandleDeploymentLogs(ctx.Writer, ctx.Request)
	})
	// WATCH ALL DEPLOYMENT LOGS USING INFORMER
	router.GET("/api/wds/logs", func(ctx *gin.Context) {
		var upgrader = websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		}
		var w = ctx.Writer
		var r = ctx.Request
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Failed to upgrade connection:", err)
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Failed to upgrade to WebSocket"})
			return
		}
		//defer conn.Close()

		clientset, err := wds.GetClientSetKubeConfig()
		if err != nil {
			log.Println("Failed to get Kubernetes client:", err)
			conn.WriteMessage(websocket.TextMessage, []byte("Error getting Kubernetes client"))
			return
		}
		ch := make(chan struct{})
		factory := informers.NewSharedInformerFactory(clientset, 10*time.Minute)
		c := wds.NewController(clientset, factory.Apps().V1().Deployments(), conn)
		factory.Start(ch)
		go c.Run(ch)
	})
	// SERVICES
	router.GET("/api/services/:namespace", resources.GetServiceList)
	router.GET("/api/services/:namespace/:name", resources.GetServiceByServiceName)
	router.POST("/api/services/create", resources.CreateService)
	router.DELETE("/api/services/delete", resources.DeleteService)

	// NAMESPACES
	router.GET("/api/namespaces", nsresources.GetAllNamespaces)
	router.GET("/api/namespaces/:name", nsresources.GetNamespaceDetails)
	router.POST("/api/namespaces/create", nsresources.CreateNamespace)
	router.PUT("/api/namespaces/update/:name", nsresources.UpdateNamespace)
	router.DELETE("/api/namespaces/delete/:name", nsresources.DeleteNamespace)
	router.GET("/ws/namespaces", nsresources.NamespaceWebSocketHandler)

	router.POST("api/deploy", api.DeployHandler)
	// ROUTES FOR BP
	router.POST("/api/bp/create", bp.CreateBp)
	router.DELETE("/api/bp/delete/:name", bp.DeleteBp)
	router.DELETE("/api/bp/delete", bp.DeleteAllBp)

	if err := router.Run(":4000"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

var logger *zap.Logger

// Initialize Zap Logger
func initLogger() {
	config := zap.NewProductionConfig()
	config.Encoding = "json"                // Ensure JSON format
	config.OutputPaths = []string{"stdout"} // Console output (can also log to a file)
	log, _ := config.Build()
	logger = log
}

// Middleware to log additional request/response details in structured format
func ZapMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Capture Request Body
		var requestBody string
		if c.Request.Body != nil {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			requestBody = string(bodyBytes)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process the request
		c.Next()

		// Capture Response Size
		responseSize := c.Writer.Size()

		// Capture Request Headers
		headers := c.Request.Header

		// Log in structured JSON format
		logger.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency", time.Since(start)),
			zap.String("ip", c.ClientIP()),
			zap.String("user-agent", c.Request.UserAgent()),
			zap.Any("query-params", c.Request.URL.Query()),
			zap.String("request-body", requestBody),
			zap.Any("headers", headers),
			zap.Int("response-size", responseSize),
		)

		// Log errors separately in structured format
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				logger.Error("Request Error",
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
					zap.Int("status", c.Writer.Status()),
					zap.String("error", err.Error()),
				)
			}
		}
	}
}

func getKubeInfo() ([]ContextInfo, []string, string, error, []ManagedClusterInfo) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
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

	// Process other kubeflex contexts (non-its)
	for contextName, context := range config.Contexts {
		if strings.HasSuffix(contextName, "-kubeflex") {
			contexts = append(contexts, ContextInfo{
				Name:    contextName,
				Cluster: context.Cluster,
			})
			clusterSet[context.Cluster] = true
		}
	}

	// Convert unique clusters to slice
	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}

	return contexts, clusters, currentContext, nil, managedClusters
}

// nolint:unused
func getITSInfo() ([]ManagedClusterInfo, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	clustersBytes, err := clientset.RESTClient().Get().
		AbsPath("/apis/cluster.open-cluster-management.io/v1").
		Resource("managedclusters").
		DoRaw(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("failed to get managed clusters: %w", err)
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
		return nil, fmt.Errorf("failed to unmarshal clusters: %w", err)
	}

	var managedClusters []ManagedClusterInfo
	for _, item := range clusterList.Items {
		managedClusters = append(managedClusters, ManagedClusterInfo{
			Name:         item.Metadata.Name,
			Labels:       item.Metadata.Labels,
			CreationTime: time.Now().UTC(),
		})
	}

	return managedClusters, nil
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
