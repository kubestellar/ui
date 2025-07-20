package k8s

import (
	"fmt"
	"os"

	"github.com/kubestellar/ui/backend/log"
	"github.com/kubestellar/ui/backend/telemetry"
	"go.uber.org/zap"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// homeDir retrieves the user's home directory
func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // Windows
}

// GetClientSet retrieves a Kubernetes clientset and dynamic client
func GetClientSet() (*kubernetes.Clientset, dynamic.Interface, error) {
	// Skip Kubernetes client initialization in test mode
	if os.Getenv("TEST_MODE") == "true" {
		log.LogInfo("Running in test mode, skipping Kubernetes client initialization")
		return nil, nil, nil
	}

	log.LogInfo("Getting Kubernetes client set")
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSet", "load_kubeconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Use WDS1 context specifically
	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		log.LogError("Failed to find context 'wds1'")
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSet", "find_context", "500").Inc()
		return nil, nil, fmt.Errorf("failed to find context 'wds1'")
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
		log.LogError("Failed to create restconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSet", "create_restconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create restconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		log.LogError("Failed to create Kubernetes client", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSet", "create_k8s_client", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create Kubernetes client: %v", err)
	}
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		log.LogError("Failed to create dynamic client", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSet", "create_dynamic_client", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	log.LogInfo("Successfully created Kubernetes clients")
	return clientset, dynamicClient, nil
}

// GetClientSetWithContext retrieves a Kubernetes clientset and dynamic client for a specified context
func GetClientSetWithContext(contextName string) (*kubernetes.Clientset, dynamic.Interface, error) {
	// Skip Kubernetes client initialization in test mode
	if os.Getenv("TEST_MODE") == "true" {
		log.LogInfo("Running in test mode, skipping Kubernetes client initialization with context", zap.String("context", contextName))
		return nil, nil, nil
	}

	log.LogInfo("Getting Kubernetes client set with context", zap.String("context", contextName))
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithContext", "load_kubeconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Check if the specified context exists
	ctxContext := config.Contexts[contextName]
	if ctxContext == nil {
		log.LogError("Failed to find context", zap.String("context", contextName))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithContext", "find_context", "500").Inc()
		return nil, nil, fmt.Errorf("failed to find context '%s'", contextName)
	}

	// Create config for the specified context
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: contextName,
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		log.LogError("Failed to create restconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithContext", "create_restconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create restconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		log.LogError("Failed to create Kubernetes client", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithContext", "create_k8s_client", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create Kubernetes client: %v", err)
	}
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		log.LogError("Failed to create dynamic client", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithContext", "create_dynamic_client", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create dynamic client: %v", err)
	}

	log.LogInfo("Successfully created Kubernetes clients with context", zap.String("context", contextName))
	return clientset, dynamicClient, nil
}

func GetClientSetWithConfigContext(contextName string) (*kubernetes.Clientset, *rest.Config, error) {
	// Skip Kubernetes client initialization in test mode
	if os.Getenv("TEST_MODE") == "true" {
		log.LogInfo("Running in test mode, skipping Kubernetes client initialization with config context", zap.String("context", contextName))
		return nil, nil, nil
	}

	log.LogInfo("Getting Kubernetes client set with config context", zap.String("context", contextName))
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = fmt.Sprintf("%s/.kube/config", home)
		}
	}

	// Load the kubeconfig file
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		log.LogError("Failed to load kubeconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithConfigContext", "load_kubeconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to load kubeconfig: %v", err)
	}

	// Check if the specified context exists
	ctxContext := config.Contexts[contextName]
	if ctxContext == nil {
		log.LogError("Failed to find context", zap.String("context", contextName))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithConfigContext", "find_context", "500").Inc()
		return nil, nil, fmt.Errorf("failed to find context '%s'", contextName)
	}

	// Create config for the specified context
	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: contextName,
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		log.LogError("Failed to create restconfig", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithConfigContext", "create_restconfig", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create restconfig: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		log.LogError("Failed to create Kubernetes client", zap.Error(err))
		telemetry.K8sClientErrorCounter.WithLabelValues("GetClientSetWithConfigContext", "create_k8s_client", "500").Inc()
		return nil, nil, fmt.Errorf("failed to create Kubernetes client: %v", err)
	}

	log.LogInfo("Successfully created Kubernetes client with config context", zap.String("context", contextName))
	return clientset, restConfig, nil
}
