package k8s_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kubestellar/ui/backend/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

func TestMain(m *testing.M) {
	setupTestKubeconfig()
	code := m.Run()
	cleanupTestKubeconfig()
	os.Exit(code)
}

func setupTestKubeconfig() {
	testConfig := &clientcmdapi.Config{
		Clusters: map[string]*clientcmdapi.Cluster{
			"test-cluster": {
				Server:                "https://test-server:443",
				InsecureSkipTLSVerify: true,
			},
			"wds1-cluster": {
				Server:                "https://wds1-server:443",
				InsecureSkipTLSVerify: true,
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
		Contexts: map[string]*clientcmdapi.Context{
			"test-context": {
				Cluster:  "test-cluster",
				AuthInfo: "test-user",
			},
			"wds1": {
				Cluster:  "wds1-cluster",
				AuthInfo: "wds1-user",
			},
		},
		CurrentContext: "test-context",
	}

	tempDir := os.TempDir()
	testKubeconfigPath := filepath.Join(tempDir, "test-kubeconfig")

	err := clientcmd.WriteToFile(*testConfig, testKubeconfigPath)
	if err != nil {
		panic(err)
	}

	os.Setenv("KUBECONFIG", testKubeconfigPath)
}

func cleanupTestKubeconfig() {
	if kubeconfigPath := os.Getenv("KUBECONFIG"); kubeconfigPath != "" {
		os.Remove(kubeconfigPath)
	}
	os.Unsetenv("KUBECONFIG")
}

func TestGetClientSet(t *testing.T) {
	tests := []struct {
		name        string
		setupFunc   func()
		cleanupFunc func()
		expectError bool
		errorMsg    string
	}{
		{
			name:        "successful client creation with wds1 context",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: false,
		},
		{
			name: "missing kubeconfig file",
			setupFunc: func() {
				os.Setenv("KUBECONFIG", "/nonexistent/path")
			},
			cleanupFunc: func() {
				setupTestKubeconfig()
			},
			expectError: true,
			errorMsg:    "failed to load kubeconfig",
		},
		{
			name: "missing wds1 context",
			setupFunc: func() {
				testConfig := &clientcmdapi.Config{
					Clusters: map[string]*clientcmdapi.Cluster{
						"test-cluster": {
							Server:                "https://test-server:443",
							InsecureSkipTLSVerify: true,
						},
					},
					AuthInfos: map[string]*clientcmdapi.AuthInfo{
						"test-user": {
							Token: "fake-token",
						},
					},
					Contexts: map[string]*clientcmdapi.Context{
						"test-context": {
							Cluster:  "test-cluster",
							AuthInfo: "test-user",
						},
					},
					CurrentContext: "test-context",
				}

				tempDir := os.TempDir()
				testKubeconfigPath := filepath.Join(tempDir, "test-kubeconfig-no-wds1")
				err := clientcmd.WriteToFile(*testConfig, testKubeconfigPath)
				require.NoError(t, err)
				os.Setenv("KUBECONFIG", testKubeconfigPath)
			},
			cleanupFunc: func() {
				if kubeconfigPath := os.Getenv("KUBECONFIG"); kubeconfigPath != "" {
					os.Remove(kubeconfigPath)
				}
				setupTestKubeconfig()
			},
			expectError: true,
			errorMsg:    "failed to find context 'wds1'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupFunc()
			defer tt.cleanupFunc()

			clientset, dynamicClient, err := k8s.GetClientSet()

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
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

func TestGetClientSetWithContext(t *testing.T) {
	tests := []struct {
		name        string
		contextName string
		setupFunc   func()
		cleanupFunc func()
		expectError bool
		errorMsg    string
	}{
		{
			name:        "successful client creation with existing context",
			contextName: "test-context",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: false,
		},
		{
			name:        "successful client creation with wds1 context",
			contextName: "wds1",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: false,
		},
		{
			name:        "nonexistent context",
			contextName: "nonexistent-context",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: true,
			errorMsg:    "failed to find context 'nonexistent-context'",
		},
		{
			name:        "missing kubeconfig file",
			contextName: "test-context",
			setupFunc: func() {
				os.Setenv("KUBECONFIG", "/nonexistent/path")
			},
			cleanupFunc: func() {
				setupTestKubeconfig()
			},
			expectError: true,
			errorMsg:    "failed to load kubeconfig",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupFunc()
			defer tt.cleanupFunc()

			clientset, dynamicClient, err := k8s.GetClientSetWithContext(tt.contextName)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
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

func TestGetClientSetWithConfigContext(t *testing.T) {
	tests := []struct {
		name        string
		contextName string
		setupFunc   func()
		cleanupFunc func()
		expectError bool
		errorMsg    string
	}{
		{
			name:        "successful client and config creation with existing context",
			contextName: "test-context",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: false,
		},
		{
			name:        "successful client and config creation with wds1 context",
			contextName: "wds1",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: false,
		},
		{
			name:        "nonexistent context",
			contextName: "nonexistent-context",
			setupFunc:   func() {},
			cleanupFunc: func() {},
			expectError: true,
			errorMsg:    "failed to find context 'nonexistent-context'",
		},
		{
			name:        "missing kubeconfig file",
			contextName: "test-context",
			setupFunc: func() {
				os.Setenv("KUBECONFIG", "/nonexistent/path")
			},
			cleanupFunc: func() {
				setupTestKubeconfig()
			},
			expectError: true,
			errorMsg:    "failed to load kubeconfig",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupFunc()
			defer tt.cleanupFunc()

			clientset, restConfig, err := k8s.GetClientSetWithConfigContext(tt.contextName)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
				assert.Nil(t, clientset)
				assert.Nil(t, restConfig)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, clientset)
				assert.NotNil(t, restConfig)
			}
		})
	}
}

func TestKubeconfigPathResolution(t *testing.T) {
	originalKubeconfig := os.Getenv("KUBECONFIG")
	originalHome := os.Getenv("HOME")
	originalUserProfile := os.Getenv("USERPROFILE")

	defer func() {
		if originalKubeconfig != "" {
			os.Setenv("KUBECONFIG", originalKubeconfig)
		} else {
			os.Unsetenv("KUBECONFIG")
		}
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		} else {
			os.Unsetenv("HOME")
		}
		if originalUserProfile != "" {
			os.Setenv("USERPROFILE", originalUserProfile)
		} else {
			os.Unsetenv("USERPROFILE")
		}
	}()

	t.Run("uses KUBECONFIG environment variable when set", func(t *testing.T) {})

	t.Run("falls back to home directory when KUBECONFIG not set", func(t *testing.T) {
		os.Unsetenv("KUBECONFIG")

		tempHome := os.TempDir()
		kubeconfigDir := filepath.Join(tempHome, ".kube")
		err := os.MkdirAll(kubeconfigDir, 0755)
		require.NoError(t, err)

		testKubeconfigPath := filepath.Join(kubeconfigDir, "config")
		testConfig := &clientcmdapi.Config{
			Clusters: map[string]*clientcmdapi.Cluster{
				"test-cluster": {
					Server:                "https://test-server:443",
					InsecureSkipTLSVerify: true,
				},
			},
			AuthInfos: map[string]*clientcmdapi.AuthInfo{
				"test-user": {
					Token: "fake-token",
				},
			},
			Contexts: map[string]*clientcmdapi.Context{
				"wds1": {
					Cluster:  "test-cluster",
					AuthInfo: "test-user",
				},
			},
			CurrentContext: "wds1",
		}

		err = clientcmd.WriteToFile(*testConfig, testKubeconfigPath)
		require.NoError(t, err)

		os.Setenv("HOME", tempHome)

		_, _, err = k8s.GetClientSet()

		os.Remove(testKubeconfigPath)
		os.Remove(kubeconfigDir)

		assert.NoError(t, err)
	})
}

func BenchmarkGetClientSet(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _, _ = k8s.GetClientSet()
	}
}

func BenchmarkGetClientSetWithContext(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _, _ = k8s.GetClientSetWithContext("test-context")
	}
}

func BenchmarkGetClientSetWithConfigContext(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _, _ = k8s.GetClientSetWithConfigContext("test-context")
	}
}
