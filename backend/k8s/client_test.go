package k8s

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

type MockableClientFactory interface {
	NewForConfig(config *rest.Config) (KubernetesClientInterface, error)
	NewDynamicForConfig(config *rest.Config) (dynamic.Interface, error)
}

type KubernetesClientInterface interface {
	Discovery() interface{}
}

type RealClientFactory struct{}

func (f *RealClientFactory) NewForConfig(config *rest.Config) (KubernetesClientInterface, error) {
	return nil, nil
}

func (f *RealClientFactory) NewDynamicForConfig(config *rest.Config) (dynamic.Interface, error) {
	return nil, nil
}

type FakeClientFactory struct {
	Scheme      *runtime.Scheme
	Objects     []runtime.Object
	ShouldError bool
	ErrorMsg    string
}

func (f *FakeClientFactory) NewForConfig(config *rest.Config) (KubernetesClientInterface, error) {
	if f.ShouldError {
		return nil, assert.AnError
	}
	fakeClient := fake.NewSimpleClientset(f.Objects...)
	return &FakeKubernetesClient{Clientset: fakeClient}, nil
}

func (f *FakeClientFactory) NewDynamicForConfig(config *rest.Config) (dynamic.Interface, error) {
	if f.ShouldError {
		return nil, assert.AnError
	}
	scheme := f.Scheme
	if scheme == nil {
		scheme = runtime.NewScheme()
	}
	return dynamicfake.NewSimpleDynamicClient(scheme, f.Objects...), nil
}

type FakeKubernetesClient struct {
	*fake.Clientset
}

func (f *FakeKubernetesClient) Discovery() interface{} {
	return f.Clientset.Discovery()
}

func GetClientSetWithFactory(factory MockableClientFactory) (KubernetesClientInterface, dynamic.Interface, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, err
	}

	ctxContext := config.Contexts["wds1"]
	if ctxContext == nil {
		return nil, nil, assert.AnError
	}

	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: "wds1",
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, nil, err
	}

	clientset, err := factory.NewForConfig(restConfig)
	if err != nil {
		return nil, nil, err
	}

	dynamicClient, err := factory.NewDynamicForConfig(restConfig)
	if err != nil {
		return nil, nil, err
	}

	return clientset, dynamicClient, nil
}

func GetClientSetWithContextAndFactory(contextName string, factory MockableClientFactory) (KubernetesClientInterface, dynamic.Interface, error) {
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home := homeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
	}

	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, nil, err
	}

	ctxContext := config.Contexts[contextName]
	if ctxContext == nil {
		return nil, nil, assert.AnError
	}

	clientConfig := clientcmd.NewDefaultClientConfig(
		*config,
		&clientcmd.ConfigOverrides{
			CurrentContext: contextName,
		},
	)

	restConfig, err := clientConfig.ClientConfig()
	if err != nil {
		return nil, nil, err
	}

	clientset, err := factory.NewForConfig(restConfig)
	if err != nil {
		return nil, nil, err
	}

	dynamicClient, err := factory.NewDynamicForConfig(restConfig)
	if err != nil {
		return nil, nil, err
	}

	return clientset, dynamicClient, nil
}

func TestHomeDir(t *testing.T) {
	tests := []struct {
		name        string
		homeEnv     string
		userProfile string
		expected    string
	}{
		{
			name:        "HOME environment variable set",
			homeEnv:     "/home/user",
			userProfile: "",
			expected:    "/home/user",
		},
		{
			name:        "USERPROFILE environment variable set (Windows)",
			homeEnv:     "",
			userProfile: "C:\\Users\\user",
			expected:    "C:\\Users\\user",
		},
		{
			name:        "Both environment variables set - HOME takes precedence",
			homeEnv:     "/home/user",
			userProfile: "C:\\Users\\user",
			expected:    "/home/user",
		},
		{
			name:        "No environment variables set",
			homeEnv:     "",
			userProfile: "",
			expected:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalHome := os.Getenv("HOME")
			originalUserProfile := os.Getenv("USERPROFILE")

			os.Setenv("HOME", tt.homeEnv)
			os.Setenv("USERPROFILE", tt.userProfile)

			defer func() {
				os.Setenv("HOME", originalHome)
				os.Setenv("USERPROFILE", originalUserProfile)
			}()

			result := homeDir()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func createTestKubeconfig(t *testing.T, contexts map[string]*clientcmdapi.Context) string {
	t.Helper()

	var currentContext string
	for contextName := range contexts {
		currentContext = contextName
		break
	}

	config := &clientcmdapi.Config{
		APIVersion: "v1",
		Kind:       "Config",
		Clusters: map[string]*clientcmdapi.Cluster{
			"test-cluster": {
				Server:                   "https://test-server:6443",
				CertificateAuthorityData: []byte("fake-ca-data"),
			},
			"wds1-cluster": {
				Server:                   "https://wds1-server:6443",
				CertificateAuthorityData: []byte("fake-wds1-ca-data"),
			},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			"test-user": {
				Token: "fake-token",
			},
			"wds1-user": {
				Token: "fake-wds1-token",
			},
		},
		Contexts:       contexts,
		CurrentContext: currentContext,
	}

	tmpDir := t.TempDir()
	kubeconfigPath := filepath.Join(tmpDir, "kubeconfig")

	err := clientcmd.WriteToFile(*config, kubeconfigPath)
	require.NoError(t, err)

	return kubeconfigPath
}

func TestGetClientSetWithFactory(t *testing.T) {
	tests := []struct {
		name          string
		contexts      map[string]*clientcmdapi.Context
		factory       *FakeClientFactory
		kubeconfigEnv string
		expectError   bool
		errorContains string
	}{
		{
			name: "successful client creation with wds1 context",
			contexts: map[string]*clientcmdapi.Context{
				"wds1": {
					Cluster:  "wds1-cluster",
					AuthInfo: "wds1-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: false,
		},
		{
			name: "missing wds1 context",
			contexts: map[string]*clientcmdapi.Context{
				"other-context": {
					Cluster:  "test-cluster",
					AuthInfo: "test-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: true,
		},
		{
			name: "client creation fails",
			contexts: map[string]*clientcmdapi.Context{
				"wds1": {
					Cluster:  "wds1-cluster",
					AuthInfo: "wds1-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: true,
				ErrorMsg:    "failed to create client",
			},
			expectError: true,
		},
		{
			name:          "invalid kubeconfig path",
			kubeconfigEnv: "/nonexistent/path",
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalKubeconfig := os.Getenv("KUBECONFIG")
			originalHome := os.Getenv("HOME")

			defer func() {
				os.Setenv("KUBECONFIG", originalKubeconfig)
				os.Setenv("HOME", originalHome)
			}()

			if tt.kubeconfigEnv != "" {
				os.Setenv("KUBECONFIG", tt.kubeconfigEnv)
			} else if tt.contexts != nil {
				kubeconfigPath := createTestKubeconfig(t, tt.contexts)
				os.Setenv("KUBECONFIG", kubeconfigPath)
			}

			clientset, dynamicClient, err := GetClientSetWithFactory(tt.factory)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, clientset)
				assert.Nil(t, dynamicClient)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, clientset)
				assert.NotNil(t, dynamicClient)
			}
		})
	}
}

func TestGetClientSetWithContextAndFactory(t *testing.T) {
	tests := []struct {
		name        string
		contextName string
		contexts    map[string]*clientcmdapi.Context
		factory     *FakeClientFactory
		expectError bool
	}{
		{
			name:        "successful client creation with valid context",
			contextName: "test-context",
			contexts: map[string]*clientcmdapi.Context{
				"test-context": {
					Cluster:  "test-cluster",
					AuthInfo: "test-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: false,
		},
		{
			name:        "context not found",
			contextName: "nonexistent-context",
			contexts: map[string]*clientcmdapi.Context{
				"test-context": {
					Cluster:  "test-cluster",
					AuthInfo: "test-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: true,
		},
		{
			name:        "wds1 context works",
			contextName: "wds1",
			contexts: map[string]*clientcmdapi.Context{
				"wds1": {
					Cluster:  "wds1-cluster",
					AuthInfo: "wds1-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: false,
			},
			expectError: false,
		},
		{
			name:        "client creation fails",
			contextName: "test-context",
			contexts: map[string]*clientcmdapi.Context{
				"test-context": {
					Cluster:  "test-cluster",
					AuthInfo: "test-user",
				},
			},
			factory: &FakeClientFactory{
				ShouldError: true,
				ErrorMsg:    "client creation failed",
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			originalKubeconfig := os.Getenv("KUBECONFIG")

			defer func() {
				os.Setenv("KUBECONFIG", originalKubeconfig)
			}()

			kubeconfigPath := createTestKubeconfig(t, tt.contexts)
			os.Setenv("KUBECONFIG", kubeconfigPath)

			clientset, dynamicClient, err := GetClientSetWithContextAndFactory(tt.contextName, tt.factory)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, clientset)
				assert.Nil(t, dynamicClient)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, clientset)
				assert.NotNil(t, dynamicClient)
			}
		})
	}
}

func TestOriginalFunctionsIntegration(t *testing.T) {
	t.Run("GetClientSet with invalid server", func(t *testing.T) {
		contexts := map[string]*clientcmdapi.Context{
			"wds1": {
				Cluster:  "wds1-cluster",
				AuthInfo: "wds1-user",
			},
		}

		originalKubeconfig := os.Getenv("KUBECONFIG")
		defer os.Setenv("KUBECONFIG", originalKubeconfig)

		kubeconfigPath := createTestKubeconfig(t, contexts)
		os.Setenv("KUBECONFIG", kubeconfigPath)

		_, _, err := GetClientSet()
		if err != nil {
			assert.NotContains(t, err.Error(), "failed to find context")
		}
	})

	t.Run("GetClientSetWithContext with invalid server", func(t *testing.T) {
		contexts := map[string]*clientcmdapi.Context{
			"test-context": {
				Cluster:  "test-cluster",
				AuthInfo: "test-user",
			},
		}

		originalKubeconfig := os.Getenv("KUBECONFIG")
		defer os.Setenv("KUBECONFIG", originalKubeconfig)

		kubeconfigPath := createTestKubeconfig(t, contexts)
		os.Setenv("KUBECONFIG", kubeconfigPath)

		_, _, err := GetClientSetWithContext("test-context")
		if err != nil {
			assert.NotContains(t, err.Error(), "failed to find context")
		}
	})
}

func TestKubeconfigFallback(t *testing.T) {
	originalKubeconfig := os.Getenv("KUBECONFIG")
	originalHome := os.Getenv("HOME")

	defer func() {
		os.Setenv("KUBECONFIG", originalKubeconfig)
		os.Setenv("HOME", originalHome)
	}()

	tmpDir := t.TempDir()
	kubeDir := filepath.Join(tmpDir, ".kube")
	err := os.MkdirAll(kubeDir, 0755)
	require.NoError(t, err)

	contexts := map[string]*clientcmdapi.Context{
		"wds1": {
			Cluster:  "wds1-cluster",
			AuthInfo: "wds1-user",
		},
	}
	kubeconfigPath := createTestKubeconfig(t, contexts)

	kubeconfigDestPath := filepath.Join(kubeDir, "config")
	err = os.Rename(kubeconfigPath, kubeconfigDestPath)
	require.NoError(t, err)

	os.Unsetenv("KUBECONFIG")
	os.Setenv("HOME", tmpDir)

	factory := &FakeClientFactory{ShouldError: false}
	clientset, dynamicClient, err := GetClientSetWithFactory(factory)

	assert.NoError(t, err)
	assert.NotNil(t, clientset)
	assert.NotNil(t, dynamicClient)
}

func BenchmarkHomeDir(b *testing.B) {
	for i := 0; i < b.N; i++ {
		homeDir()
	}
}

func BenchmarkGetClientSetWithContextAndFactory(b *testing.B) {
	contexts := map[string]*clientcmdapi.Context{
		"test-context": {
			Cluster:  "test-cluster",
			AuthInfo: "test-user",
		},
	}

	config := &clientcmdapi.Config{
		APIVersion: "v1",
		Kind:       "Config",
		Clusters: map[string]*clientcmdapi.Cluster{
			"test-cluster": {
				Server:                   "https://test-server:6443",
				CertificateAuthorityData: []byte("fake-ca-data"),
			},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			"test-user": {
				Token: "fake-token",
			},
		},
		Contexts:       contexts,
		CurrentContext: "test-context",
	}

	tmpDir := b.TempDir()
	kubeconfigPath := filepath.Join(tmpDir, "kubeconfig")
	err := clientcmd.WriteToFile(*config, kubeconfigPath)
	if err != nil {
		b.Fatal(err)
	}

	originalKubeconfig := os.Getenv("KUBECONFIG")
	os.Setenv("KUBECONFIG", kubeconfigPath)
	defer os.Setenv("KUBECONFIG", originalKubeconfig)

	factory := &FakeClientFactory{ShouldError: false}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		GetClientSetWithContextAndFactory("test-context", factory)
	}
}
