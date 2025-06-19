package services

import (
	"context"
	"fmt"
	"time"

	"github.com/kubestellar/ui/log"
	"github.com/kubestellar/ui/models"
	"go.uber.org/zap"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

func GetClusterConfigByName(data []byte, clusterName string) ([]byte, error) {
	log.LogInfo("Getting cluster config by name", zap.String("cluster", clusterName))

	config, err := clientcmd.Load(data)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.Error(err))
		return nil, fmt.Errorf("invalid kubeconfig: %w", err)
	}

	cluster, exists := config.Clusters[clusterName]
	if !exists {
		log.LogError("Cluster not found", zap.String("cluster", clusterName))
		return nil, fmt.Errorf("cluster '%s' not found in kubeconfig", clusterName)
	}

	log.LogDebug("Found cluster in config",
		zap.String("cluster", clusterName),
		zap.String("server", cluster.Server))

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

	log.LogDebug("Created single cluster config",
		zap.String("cluster", clusterName),
		zap.String("currentContext", singleClusterConfig.CurrentContext))

	serializedConfig, err := clientcmd.Write(*singleClusterConfig)
	if err != nil {
		log.LogError("Failed to write config", zap.Error(err))
		return nil, fmt.Errorf("failed to serialize kubeconfig for cluster '%s': %w", clusterName, err)
	}

	log.LogInfo("Successfully retrieved cluster config",
		zap.String("cluster", clusterName),
		zap.Int("configSize", len(serializedConfig)))
	return serializedConfig, nil
}

func ValidateClusterConnectivity(kubeconfigData []byte) error {
	log.LogInfo("Validating cluster connectivity", zap.Int("configSize", len(kubeconfigData)))

	// Load REST config from kubeconfig
	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfigData)
	if err != nil {
		log.LogError("Failed to create client config", zap.Error(err))
		return fmt.Errorf("failed to parse kubeconfig: %w", err)
	}

	log.LogDebug("Created REST config",
		zap.String("host", config.Host),
		zap.String("userAgent", config.UserAgent))

	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.LogError("Failed to create clientset", zap.Error(err))
		return fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	log.LogDebug("Created Kubernetes clientset")

	// Test connectivity by listing nodes
	nodes, err := client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		log.LogError("Failed to list nodes", zap.Error(err))
		return fmt.Errorf("failed to connect to the cluster: %w", err)
	}

	log.LogInfo("Successfully validated cluster connectivity",
		zap.Int("nodeCount", len(nodes.Items)))
	return nil
}

// ImportCluster imports a cluster into the system
func ImportCluster(cluster models.Cluster) {
	log.LogInfo("Initiating import for cluster",
		zap.String("name", cluster.Name))

	go func(c models.Cluster) {
		// Simulate a delay in importing the cluster.
		log.LogInfo("Starting import process for cluster",
			zap.String("name", c.Name))
		time.Sleep(15 * time.Second)
		// Replace with your real import/provisioning logic.
		log.LogInfo("Cluster imported successfully",
			zap.String("name", c.Name))
	}(cluster)
}
