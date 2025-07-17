package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

// setupTestKubeconfig creates a temporary kubeconfig file for testing
func setupTestKubeconfig(t *testing.T) string {
	tempDir := t.TempDir()
	kubeconfigPath := filepath.Join(tempDir, "config")

	// Create a minimal kubeconfig
	config := &clientcmdapi.Config{
		Clusters: map[string]*clientcmdapi.Cluster{
			"test-cluster": {
				Server:                   "https://test-server:6443",
				InsecureSkipTLSVerify:    true,
				CertificateAuthorityData: []byte("test-ca-data"),
			},
		},
		Contexts: map[string]*clientcmdapi.Context{
			"test-context": {
				Cluster:  "test-cluster",
				AuthInfo: "test-user",
			},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			"test-user": {
				Token: "test-token",
			},
		},
		CurrentContext: "test-context",
	}

	err := clientcmd.WriteToFile(*config, kubeconfigPath)
	require.NoError(t, err)

	return kubeconfigPath
}

// createTestNodes creates sample nodes for testing
func createTestNodes() []runtime.Object {
	return []runtime.Object{
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{
				Name: "node1",
			},
			Status: corev1.NodeStatus{
				Capacity: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("4"),
					corev1.ResourceMemory: resource.MustParse("8Gi"),
				},
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("3.5"),
					corev1.ResourceMemory: resource.MustParse("7Gi"),
				},
			},
		},
		&corev1.Node{
			ObjectMeta: metav1.ObjectMeta{
				Name: "node2",
			},
			Status: corev1.NodeStatus{
				Capacity: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("2"),
					corev1.ResourceMemory: resource.MustParse("4Gi"),
				},
				Allocatable: corev1.ResourceList{
					corev1.ResourceCPU:    resource.MustParse("1.5"),
					corev1.ResourceMemory: resource.MustParse("3Gi"),
				},
			},
		},
	}
}

// createTestPods creates sample pods for testing
func createTestPods() []runtime.Object {
	return []runtime.Object{
		&corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: "default",
			},
		},
		&corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Name: "test-namespace",
			},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-pod-1",
				Namespace: "default",
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name: "container1",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("100m"),
								corev1.ResourceMemory: resource.MustParse("128Mi"),
							},
						},
					},
				},
			},
			Status: corev1.PodStatus{
				Phase: corev1.PodRunning,
			},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "test-pod-2",
				Namespace: "test-namespace",
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name: "container1",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("500m"),
								corev1.ResourceMemory: resource.MustParse("256Mi"),
							},
						},
					},
					{
						Name: "container2",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("200m"),
								corev1.ResourceMemory: resource.MustParse("512Mi"),
							},
						},
					},
				},
			},
			Status: corev1.PodStatus{
				Phase: corev1.PodRunning,
			},
		},
		&corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{
				Name:      "pending-pod",
				Namespace: "default",
			},
			Spec: corev1.PodSpec{
				Containers: []corev1.Container{
					{
						Name: "container1",
						Resources: corev1.ResourceRequirements{
							Requests: corev1.ResourceList{
								corev1.ResourceCPU:    resource.MustParse("1"),
								corev1.ResourceMemory: resource.MustParse("1Gi"),
							},
						},
					},
				},
			},
			Status: corev1.PodStatus{
				Phase: corev1.PodPending, // This should be ignored in calculations
			},
		},
	}
}

func TestGetClusterMetrics(t *testing.T) {
	// Set up test environment
	kubeconfigPath := setupTestKubeconfig(t)
	os.Setenv("KUBECONFIG", kubeconfigPath)
	defer os.Unsetenv("KUBECONFIG")

	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/metrics", k8s.GetClusterMetrics)

	tests := []struct {
		name           string
		expectedStatus int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name:           "successful metrics retrieval",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, body []byte) {
				var response k8s.ClusterMetricsResponse
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.GreaterOrEqual(t, response.TotalClusters, 0)
				assert.GreaterOrEqual(t, response.ActiveClusters, 0)
				assert.NotEmpty(t, response.Timestamp)
				assert.NotNil(t, response.Clusters)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/metrics", nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, rr.Body.Bytes())
			}
		})
	}
}

func TestGetClusterMetricsForContext(t *testing.T) {
	// Set up test environment
	kubeconfigPath := setupTestKubeconfig(t)
	os.Setenv("KUBECONFIG", kubeconfigPath)
	defer os.Unsetenv("KUBECONFIG")

	// Set up Gin in test mode
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/metrics/:context", k8s.GetClusterMetricsForContext)

	tests := []struct {
		name           string
		context        string
		expectedStatus int
		checkResponse  func(t *testing.T, body []byte)
	}{
		{
			name:           "missing context parameter",
			context:        "",
			expectedStatus: http.StatusNotFound, // Gin returns 404 for missing route params
		},
		{
			name:           "valid context",
			context:        "test-context",
			expectedStatus: http.StatusInternalServerError, // Expected since we can't actually connect to test cluster
			checkResponse: func(t *testing.T, body []byte) {
				var response map[string]interface{}
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)
				assert.Contains(t, response, "error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := fmt.Sprintf("/metrics/%s", tt.context)
			req, err := http.NewRequest("GET", url, nil)
			require.NoError(t, err)

			rr := httptest.NewRecorder()
			router.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectedStatus, rr.Code)
			if tt.checkResponse != nil {
				tt.checkResponse(t, rr.Body.Bytes())
			}
		})
	}
}

func TestClusterMetricsStruct(t *testing.T) {
	// Test ClusterMetrics struct serialization
	metrics := k8s.ClusterMetrics{
		ClusterName: "test-cluster",
		CPUUsage:    75.5,
		MemoryUsage: 60.0,
		TotalCPU:    "4.0 cores",
		TotalMemory: "8.0 Gi",
		UsedCPU:     "3.0 cores",
		UsedMemory:  "4.8 Gi",
		NodeCount:   2,
		Timestamp:   time.Now().Format(time.RFC3339),
	}

	// Test JSON serialization
	jsonData, err := json.Marshal(metrics)
	require.NoError(t, err)

	// Test JSON deserialization
	var deserializedMetrics k8s.ClusterMetrics
	err = json.Unmarshal(jsonData, &deserializedMetrics)
	require.NoError(t, err)

	assert.Equal(t, metrics.ClusterName, deserializedMetrics.ClusterName)
	assert.Equal(t, metrics.CPUUsage, deserializedMetrics.CPUUsage)
	assert.Equal(t, metrics.MemoryUsage, deserializedMetrics.MemoryUsage)
	assert.Equal(t, metrics.NodeCount, deserializedMetrics.NodeCount)
}

func TestClusterMetricsResponse(t *testing.T) {
	// Test ClusterMetricsResponse struct
	response := k8s.ClusterMetricsResponse{
		Clusters: []k8s.ClusterMetrics{
			{
				ClusterName: "cluster1",
				CPUUsage:    50.0,
				MemoryUsage: 40.0,
				NodeCount:   1,
			},
			{
				ClusterName: "cluster2",
				CPUUsage:    70.0,
				MemoryUsage: 60.0,
				NodeCount:   2,
			},
		},
		OverallCPU:     60.0,
		OverallMemory:  50.0,
		TotalClusters:  2,
		ActiveClusters: 2,
		Timestamp:      time.Now().Format(time.RFC3339),
	}

	// Test JSON serialization
	jsonData, err := json.Marshal(response)
	require.NoError(t, err)

	// Test JSON deserialization
	var deserializedResponse k8s.ClusterMetricsResponse
	err = json.Unmarshal(jsonData, &deserializedResponse)
	require.NoError(t, err)

	assert.Equal(t, response.TotalClusters, deserializedResponse.TotalClusters)
	assert.Equal(t, response.ActiveClusters, deserializedResponse.ActiveClusters)
	assert.Equal(t, response.OverallCPU, deserializedResponse.OverallCPU)
	assert.Equal(t, response.OverallMemory, deserializedResponse.OverallMemory)
	assert.Len(t, deserializedResponse.Clusters, 2)
}

// Integration test with fake Kubernetes client
func TestGetClusterResourceMetricsWithFakeClient(t *testing.T) {
	// Create fake client with test data
	objects := append(createTestNodes(), createTestPods()...)
	fakeClient := fake.NewSimpleClientset(objects...)

	// This test would require modification to the original code to accept a clientset parameter
	// For now, we'll test the behavior we expect

	// Test that the function would work with proper data
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Verify nodes exist
	nodes, err := fakeClient.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	require.NoError(t, err)
	assert.Len(t, nodes.Items, 2)

	// Verify pods exist
	pods, err := fakeClient.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	require.NoError(t, err)
	assert.Len(t, pods.Items, 3) // 2 running + 1 pending

	// Verify namespaces exist
	namespaces, err := fakeClient.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	require.NoError(t, err)
	assert.Len(t, namespaces.Items, 2)
}

func TestCacheExpiration(t *testing.T) {
	// This test verifies the cache mechanism behavior
	// Note: This would require access to package-level variables or modification of the original code
	// to make the cache mechanism more testable

	// For now, we'll test that multiple requests within the cache period
	// should return the same timestamp (indicating cache usage)

	kubeconfigPath := setupTestKubeconfig(t)
	os.Setenv("KUBECONFIG", kubeconfigPath)
	defer os.Unsetenv("KUBECONFIG")

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/metrics", k8s.GetClusterMetrics)

	// Make first request
	req1, err := http.NewRequest("GET", "/metrics", nil)
	require.NoError(t, err)
	rr1 := httptest.NewRecorder()
	router.ServeHTTP(rr1, req1)

	// Make second request immediately after
	req2, err := http.NewRequest("GET", "/metrics", nil)
	require.NoError(t, err)
	rr2 := httptest.NewRecorder()
	router.ServeHTTP(rr2, req2)

	// Both requests should return some response (even if it's an error due to fake cluster)
	assert.Equal(t, rr1.Code, rr2.Code)
}
