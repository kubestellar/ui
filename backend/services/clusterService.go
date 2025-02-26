package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/katamyra/kubestellarUI/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

func GetClusterConfigByName(data []byte, clusterName string) ([]byte, error) {
	config, err := clientcmd.Load(data)
	if err != nil {
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}

	cluster, exists := config.Clusters[clusterName]
	if !exists {
		return nil, fmt.Errorf("cluster '%s' not found in kubeconfig", clusterName)
	}

	singleClusterConfig := &api.Config{
		Clusters: map[string]*api.Cluster{
			clusterName: cluster,
		},
		Contexts: map[string]*api.Context{
			clusterName: {
				Cluster:  clusterName,
				AuthInfo: config.Contexts[config.CurrentContext].AuthInfo,
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			config.Contexts[config.CurrentContext].AuthInfo: config.AuthInfos[config.Contexts[config.CurrentContext].AuthInfo],
		},
		CurrentContext: clusterName,
	}

	serializedConfig, err := clientcmd.Write(*singleClusterConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize kubeconfig for cluster '%s': %w", clusterName, err)
	}

	return serializedConfig, nil
}

func ValidateClusterConnectivity(kubeconfigData []byte) error {
	// Load REST config from kubeconfig
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
	if err != nil {
		return fmt.Errorf("failed to parse kubeconfig: %w", err)
	}

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	// Test connectivity by listing nodes
	_, err = client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to connect to the cluster: %w", err)
	}

	return nil
}

// ImportCluster imports a cluster into the system
func ImportCluster(cluster models.Cluster) {
	log.Printf("Initiating import for cluster: %+v", cluster)
	go func(c models.Cluster) {
		// Simulate a delay in importing the cluster.
		time.Sleep(15 * time.Second)
		// Replace with your real import/provisioning logic.
		log.Printf("Cluster '%s' imported successfully", c.Name)
	}(cluster)
}
