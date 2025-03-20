package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	jwtconfig "github.com/kubestellar/ui/jwt"
	"github.com/kubestellar/ui/k8s"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ConfigMapName and Namespace
const (
	ConfigMapName = "jwt-config"
	Namespace     = "kubestellar"
)

// Config struct to hold data from ConfigMap
type Config struct {
	JWTSecret   string   `json:"jwt_secret"`
	User        string   `json:"user"`
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}

// LoadK8sConfigMap checks if the ConfigMap exists, creates it if not, and returns its data.
func LoadK8sConfigMap() (*Config, error) {
	// We'll load the JWT secret from ConfigMap first, then initialize other configs
	// This prevents generating a new random secret on each restart

	// Get the Kubernetes clientset
	clientset, _, err := k8s.GetClientSetWithContext("its1")
	if err != nil {
		return nil, fmt.Errorf("failed to get Kubernetes clientset: %v", err)
	}

	// Check if namespace exists, create it if it doesn't
	if err := ensureNamespaceExists(clientset); err != nil {
		return nil, fmt.Errorf("failed to ensure namespace exists: %v", err)
	}

	// Try to get the ConfigMap
	cm, err := clientset.CoreV1().ConfigMaps(Namespace).Get(context.TODO(), ConfigMapName, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			// If the ConfigMap does not exist, create it
			log.Println("ConfigMap not found. Creating a new one with admin user...")

			if err := CreateConfigMap(clientset); err != nil {
				return nil, fmt.Errorf("failed to create ConfigMap: %v", err)
			}

			log.Println("Admin user created successfully")

			// Fetch again after creation
			cm, err = clientset.CoreV1().ConfigMaps(Namespace).Get(context.TODO(), ConfigMapName, metav1.GetOptions{})
			if err != nil {
				return nil, fmt.Errorf("failed to get ConfigMap after creation: %v", err)
			}
		} else {
			return nil, fmt.Errorf("error fetching ConfigMap: %v", err)
		}
	} else {
		log.Println("Admin configuration already exists")
	}

	// Parse the ConfigMap JSON data
	var configData Config
	if err := json.Unmarshal([]byte(cm.Data["config"]), &configData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ConfigMap data: %v", err)
	}

	// Update JWT secret in environment to match the one from ConfigMap
	// This ensures tokens remain valid after server restarts
	jwtconfig.SetJWTSecret(configData.JWTSecret)

	// Now we can safely load other configs after ensuring JWT secret is set
	jwtconfig.LoadConfig()

	log.Println("ConfigMap loaded successfully and JWT secret updated.")
	return &configData, nil
}

// createConfigMap creates a new ConfigMap with default values.
func CreateConfigMap(clientset *kubernetes.Clientset) error {
	// Get JWT secret from environment
	jwtSecret := jwtconfig.GetJWTSecret()

	defaultConfig := Config{
		JWTSecret:   jwtSecret, // Use JWT secret from environment
		User:        "admin",
		Password:    "",
		Permissions: []string{"read", "write"},
	}

	log.Printf("Creating admin user with JWT secret from environment")

	// Convert struct to JSON string
	configDataBytes, err := json.Marshal(defaultConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal default config: %v", err)
	}
	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ConfigMapName,
			Namespace: Namespace,
		},
		Data: map[string]string{
			"config": string(configDataBytes),
		},
	}

	_, err = clientset.CoreV1().ConfigMaps(Namespace).Create(context.TODO(), configMap, metav1.CreateOptions{})
	if err != nil {
		if errors.IsAlreadyExists(err) {
			log.Println("ConfigMap already exists, skipping creation.")
			return nil
		}
		return fmt.Errorf("error creating ConfigMap: %v", err)
	}

	log.Println("ConfigMap created successfully with admin user.")
	return nil
}

// ensureNamespaceExists checks if the namespace exists and creates it if it doesn't
func ensureNamespaceExists(clientset *kubernetes.Clientset) error {
	_, err := clientset.CoreV1().Namespaces().Get(context.TODO(), Namespace, metav1.GetOptions{})
	if err != nil {
		if errors.IsNotFound(err) {
			log.Printf("Namespace %s not found. Creating it...", Namespace)
			ns := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: Namespace,
				},
			}
			_, err = clientset.CoreV1().Namespaces().Create(context.TODO(), ns, metav1.CreateOptions{})
			if err != nil {
				return fmt.Errorf("error creating namespace: %v", err)
			}
			log.Printf("Namespace %s created successfully", Namespace)
		} else {
			return fmt.Errorf("error checking namespace: %v", err)
		}
	}
	return nil
}
