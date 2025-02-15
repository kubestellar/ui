package deployment

/*
----- This are the things are present in this file -----
GetDeploymentByName, GetWDSWorkloads
*/

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type WorkloadInfo struct {
	Name         string    `json:"name"`
	Kind         string    `json:"kind"` // 'Deployment' or 'Service'
	Namespace    string    `json:"namespace"`
	CreationTime time.Time `json:"creationTime"`
}

func GetDeploymentByName(c *gin.Context) {

	name := c.Param("name")
	namespace := c.Query("namespace")
	if namespace == "" {
		namespace = "default" // Use "default" namespace if not provided
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
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

func GetWDSWorkloads() ([]WorkloadInfo, error) {
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
