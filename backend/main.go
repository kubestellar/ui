package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/retry"
)

type ContextInfo struct {
	Name    string `json:"name"`
	Cluster string `json:"cluster"`
}

type ManagedClusterInfo struct {
	Name         string            `json:"name"`
	Labels       map[string]string `json:"labels"`
	CreationTime time.Time         `json:"creationTime"`
}

type WorkloadInfo struct {
	Name         string    `json:"name"`
	Kind         string    `json:"kind"` // 'Deployment' or 'Service'
	Namespace    string    `json:"namespace"`
	CreationTime time.Time `json:"creationTime"`
}

func main() {
	router := gin.Default()

	log.Println("Debug: KubestellarUI application started")

	// CORS Middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET")
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

	router.GET("/api/wds/workloads", func(c *gin.Context) {
		workloads, err := getWDSWorkloads()
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
		workloads, err := getWDSWorkloads()
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
	router.POST("/api/wds/create", createDeployment)
	router.PUT("/api/wds/update", updateDeployment)
	router.DELETE("/api/wds/delete", deleteDeployment)
	router.GET("/api/wds/:name", getDeploymentByName)
	router.Run(":4000")
}

func getKubeInfo() ([]ContextInfo, []string, string, error, []ManagedClusterInfo) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
		log.Printf("Using default kubeconfig path: %s", kubeconfig)
	} else {
		log.Printf("Using kubeconfig from enviorment: %s", kubeconfig)
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, "", err, nil
	}

	var contexts []ContextInfo
	clusterSet := make(map[string]bool) // Use map to track unique clusters

	// Get contexts and their associated clusters
	for contextName, context := range config.Contexts {
		contexts = append(contexts, ContextInfo{
			Name:    contextName,
			Cluster: context.Cluster,
		})
		clusterSet[context.Cluster] = true
	}

	// Convert unique clusters to slice
	var clusters []string
	for clusterName := range clusterSet {
		clusters = append(clusters, clusterName)
	}

	itsData, err := getITSInfo()
	if err != nil {
		fmt.Printf("ITS error: %v\n", err) // Debug print
		// Don't return error, continue with other data
	}

	return contexts, clusters, config.CurrentContext, nil, itsData
}

func int32Ptr(i int32) *int32 { return &i }

func createDeployment(ctx *gin.Context) {
	// Load the kubeconfig
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to load kubeconfig",
			"err":     err,
		})
		return
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "WDS1 context not found in kubeconfig",
		})
		return
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
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create rest config",
			"err":     err,
		})
		return
	}

	// Create the Kubernetes clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	// upload the yaml configuration file and read their value
	dat, err := uploadFile(ctx)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to upload",
			"err":     err,
		})
		return
	}

	replica := 1
	if dat.Spec.Replicas&1 == 0 {
		replica = dat.Spec.Replicas
	}

	// create the deployment object
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      dat.Metadata.Name,
			Namespace: "default", // currently i am going with the default namespace
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: int32Ptr(int32(replica)),
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{
					"app": dat.Spec.Selector.MatchLabels["app"],
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": dat.Spec.Template.Metadata.Labels["app"],
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  dat.Spec.Template.Spec.Containers[0].Name,
							Image: dat.Spec.Template.Spec.Containers[0].Image,
							Ports: []corev1.ContainerPort{
								{
									ContainerPort: 80,
								},
							},
						},
					},
				},
			},
		},
	}
	// create the deployment
	retryErr := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		_, err := clientset.AppsV1().Deployments("default").Create(context.TODO(), deployment, metav1.CreateOptions{})
		return err
	})
	if retryErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create deployment",
			"err":     retryErr,
		})
		return
	}
	fmt.Println("Deployment created successfully!")
	ctx.JSON(http.StatusAccepted, gin.H{
		"message":    "Deployment created successfully!",
		"deployment": deployment,
	})
}

func updateDeployment(ctx *gin.Context) {
	type parameters struct {
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
		Image     string `json:"image"`
		Replicas  int32  `json:"replicas"`
	}
	params := parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if params.Name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "enter name of the deployment"})
		return
	}
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to load kubeconfig",
			"err":     err,
		})
		return
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "WDS1 context not found in kubeconfig",
		})
		return
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
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create rest config",
			"err":     err,
		})
		return
	}

	// Create the Kubernetes clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}

	if params.Namespace == "" {
		params.Namespace = "default"
	}

	// get the deployment object
	deployment, err := clientset.AppsV1().Deployments(params.Namespace).Get(context.TODO(), params.Name, metav1.GetOptions{})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to get deployment",
			"error":   err.Error()})
		return
	}

	// update the deployment - we are currently changing only Image and Replicas
	if params.Image != "" {
		deployment.Spec.Template.Spec.Containers[0].Image = params.Image
	}
	if params.Replicas&1 == 0 {
		deployment.Spec.Replicas = int32Ptr(params.Replicas)
	}
	retryErr := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		_, updateErr := clientset.AppsV1().Deployments("default").Update(context.TODO(), deployment, metav1.UpdateOptions{})
		return updateErr
	})
	if retryErr != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to update deployment",
			"error":   retryErr})
		return
	}

	ctx.JSON(http.StatusAccepted, gin.H{
		"message": "Successfully updated the deployment!",
		"name":    params.Name,
	})
}
func deleteDeployment(ctx *gin.Context) {
	type parameters struct {
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
	}
	params := parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if params.Namespace == "" {
		params.Namespace = "default"
	}
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to load kubeconfig",
			"error":   err.Error(),
		})
		return
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "WDS1 context not found in kubeconfig",
		})
		return
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
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create rest config",
			"error":   err.Error(),
		})
		return
	}

	// Create the Kubernetes clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"error":   err.Error(),
		})
		return
	}
	deletePolicy := metav1.DeletePropagationForeground
	// taking name and namespace from user
	err = clientset.AppsV1().Deployments(params.Namespace).Delete(context.TODO(), params.Name, metav1.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to delete deployment",
			"error":   err.Error(),
		})
		return
	}
	ctx.JSON(http.StatusAccepted, gin.H{
		"name":    params.Name,
		"message": "Successfully deleted deployment",
	})
}

type DeploymentStatus struct {
	Name              string `json:"name"`
	Namespace         string `json:"namespace"`
	Replicas          int32  `json:"replicas"`
	AvailableReplicas int32  `json:"available_replicas"`
}

func getDeploymentByName(c *gin.Context) {
	name := c.Param("name")
	namespace := c.Query("namespace")
	if namespace == "" {
		namespace = "default" // Use "default" namespace if not provided
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load kubeconfig"})
		return
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "WDS1 context not found in kubeconfig"})
		return
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize Kubernetes client config"})
		return
	}

	// Create the Kubernetes clientset
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize Kubernetes client"})
		return
	}
	// deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found", "details": err.Error()})
		return
	}
	logDeployments(deployment)
	status := make(map[string]interface{})
	if deployment.Status.AvailableReplicas > 0 {
		status["availableReplicas"] = deployment.Status.AvailableReplicas
	}
	if deployment.Status.UnavailableReplicas > 0 {
		status["unavailableReplicas"] = deployment.Status.UnavailableReplicas
	}
	if len(deployment.Status.Conditions) > 0 {
		status["conditions"] = deployment.Status.Conditions
	}
	c.JSON(http.StatusOK, gin.H{
		"apiVersion": deployment.APIVersion,
		"kind":       deployment.Kind,
		"metadata":   deployment.ObjectMeta,
		"spec":       deployment.Spec,
		"status":     status,
	})
}

type Deployment struct {
	APIVersion string `yaml:"apiVersion"`
	Kind       string `yaml:"kind"`
	Metadata   struct {
		Name   string            `yaml:"name"`
		Labels map[string]string `yaml:"labels"`
	} `yaml:"metadata"`
	Spec struct {
		Replicas int `yaml:"replicas"`
		Selector struct {
			MatchLabels map[string]string `yaml:"matchLabels"`
		} `yaml:"selector"`
		Template struct {
			Metadata struct {
				Labels map[string]string `yaml:"labels"`
			} `yaml:"metadata"`
			Spec struct {
				Containers []struct {
					Name  string `yaml:"name"`
					Image string `yaml:"image"`
					Ports []struct {
						ContainerPort int `yaml:"containerPort"`
					} `yaml:"ports"`
				} `yaml:"containers"`
			} `yaml:"spec"`
		} `yaml:"template"`
	} `yaml:"spec"`
}

func uploadFile(ctx *gin.Context) (*Deployment, error) {
	file, header, err := ctx.Request.FormFile("wds")
	if err != nil {
		return nil, err
	}

	fileExt := filepath.Ext(header.Filename)
	if fileExt != ".yaml" {
		return nil, fmt.Errorf("file extension must be .yaml")
	}
	originalFileName := strings.TrimSuffix(filepath.Base(header.Filename), filepath.Ext(header.Filename))
	now := time.Now()
	filename := strings.ReplaceAll(strings.ToLower(originalFileName), " ", "-") + "-" + fmt.Sprintf("%v", now.Unix()) + fileExt
	log.Print(filename)
	tempDir := "/tmp"
	// upload  it
	out, err := os.Create(filepath.Join(tempDir, filename))
	if err != nil {
		log.Fatal(err)
	}
	defer out.Close()
	_, err = io.Copy(out, file)
	if err != nil {
		log.Fatal(err)
	}
	// read the yaml file
	yamlData, err := os.ReadFile(filepath.Join(tempDir, filename))
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %v", err)
	}

	var deployment Deployment
	if err := yaml.Unmarshal(yamlData, &deployment); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %v", err)
	}
	log.Print(deployment)
	// ctx.JSON(http.StatusOK, gin.H{
	// 	"status":     "success",
	// 	"name":       deployment.Metadata.Name,
	// 	"replicas":   deployment.Spec.Replicas,
	// 	"container":  deployment.Spec.Template.Spec.Containers[0].Name,
	// 	"image":      deployment.Spec.Template.Spec.Containers[0].Image,
	// 	"deployment": deployment,
	// })
	return &deployment, nil
}

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

func logDeployments(deployments interface{}) {
	data, err := json.MarshalIndent(map[string]interface{}{
		"deployment": deployments,
	}, "", "  ") // Indentation of 2 spaces
	if err != nil {
		log.Printf("Error marshalling deployments: %v", err)
		return
	}

	log.Println(string(data))
}

func getWDSWorkloads() ([]WorkloadInfo, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, err
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		return nil, fmt.Errorf("WDS1 context not found in kubeconfig")
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
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}

	// Get Deployments
	deployments, err := clientset.AppsV1().Deployments("").List(context.TODO(), metav1.ListOptions{})
	logDeployments(deployments)
	if err != nil {
		return nil, fmt.Errorf("failed to get deployments: %w", err)
	}

	// Get Services
	services, err := clientset.CoreV1().Services("").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get services: %w", err)
	}

	var workloads []WorkloadInfo

	// Add deployments to workloads
	for _, deployment := range deployments.Items {
		workloads = append(workloads, WorkloadInfo{
			Name:         deployment.Name,
			Kind:         "Deployment",
			Namespace:    deployment.Namespace,
			CreationTime: deployment.CreationTimestamp.Time,
		})
	}

	// Add services to workloads
	for _, service := range services.Items {
		workloads = append(workloads, WorkloadInfo{
			Name:         service.Name,
			Kind:         "Service",
			Namespace:    service.Namespace,
			CreationTime: service.CreationTimestamp.Time,
		})
	}

	return workloads, nil
}
