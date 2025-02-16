package services

import (
	"context"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	mergeMutex sync.Mutex
)

func MergeClusterConfig(uploadedConfig *clientcmdapi.Config, clusterName string) error {
	log.Printf("Starting MergeClusterConfig for cluster: %s", clusterName)
	mergeMutex.Lock()
	defer mergeMutex.Unlock()

	defaultPath := GetDefaultKubeconfigPath()
	log.Printf("Loading kubeconfig from default path: %s", defaultPath)

	// Load or create config
	config, err := clientcmd.LoadFromFile(defaultPath)
	if os.IsNotExist(err) {
		log.Printf("No kubeconfig found, creating new config.")
		config = clientcmdapi.NewConfig()
	} else if err != nil {
		log.Printf("Failed to load kubeconfig: %v", err)
		return fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	// Generate ITS context name
	baseContext := fmt.Sprintf("its-imported-%s", clusterName)
	contextName := baseContext
	counter := 1

	// Ensure unique context name
	for _, exists := config.Contexts[contextName]; exists; {
		contextName = fmt.Sprintf("%s-%d", baseContext, counter)
		counter++
	}
	log.Printf("Generated unique context name: %s", contextName)

	// Validate cluster in uploaded config
	cluster, exists := uploadedConfig.Clusters[clusterName]
	if !exists {
		log.Printf("Cluster '%s' not found in uploaded config", clusterName)
		return fmt.Errorf("cluster '%s' not found in uploaded config", clusterName)
	}

	// Add cluster configuration
	config.Clusters[clusterName] = cluster
	log.Printf("Added cluster '%s' to kubeconfig", clusterName)

	// Add auth info
	authInfoName := uploadedConfig.Contexts[uploadedConfig.CurrentContext].AuthInfo
	config.AuthInfos[authInfoName] = uploadedConfig.AuthInfos[authInfoName]
	log.Printf("Added auth info for cluster '%s'", clusterName)

	// Create context
	config.Contexts[contextName] = &clientcmdapi.Context{
		Cluster:  clusterName,
		AuthInfo: authInfoName,
	}

	// Write merged config
	log.Printf("Writing merged kubeconfig to: %s", defaultPath)
	if err := clientcmd.WriteToFile(*config, defaultPath); err != nil {
		log.Printf("Failed to write kubeconfig: %v", err)
		return fmt.Errorf("failed to write kubeconfig: %w", err)
	}

	log.Printf("Successfully merged kubeconfig for cluster: %s", clusterName)
	return nil
}

func ValidateClusterAccess(kubeconfig []byte) error {
	log.Println("Starting cluster access validation.")
	restConfig, err := clientcmd.RESTConfigFromKubeConfig(kubeconfig)
	if err != nil {
		log.Printf("Invalid kubeconfig: %v", err)
		return fmt.Errorf("invalid kubeconfig: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		log.Printf("Failed to create client: %v", err)
		return fmt.Errorf("failed to create client: %w", err)
	}

	// Validate connectivity
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	log.Println("Testing cluster connectivity by listing namespaces.")
	_, err = clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{Limit: 1})
	if err != nil {
		log.Printf("Cluster connectivity test failed: %v", err)
		return fmt.Errorf("cluster connectivity test failed: %w", err)
	}

	log.Println("Cluster access validated successfully.")
	return nil
}

func GetDefaultKubeconfigPath() string {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig != "" {
		log.Printf("Using KUBECONFIG environment variable: %s", kubeconfig)
		return kubeconfig
	}
	defaultPath := filepath.Join(homeDir(), ".kube", "config")
	log.Printf("Using default kubeconfig path: %s", defaultPath)
	return defaultPath
}

func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
