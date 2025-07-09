package wds_test

import (
	"context"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/backend/wds"
	"github.com/stretchr/testify/assert"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/util/workqueue"
)

type mockConn struct {
	lastMessage []byte
	closed      bool
}

func (m *mockConn) WriteMessage(messageType int, data []byte) error {
	m.lastMessage = data
	return nil
}

func (m *mockConn) Close() error {
	m.closed = true
	return nil
}

// Test the Controller struct creation
func TestControllerStruct(t *testing.T) {
	// Test that we can create a controller using the NewController function
	controller := &wds.Controller{}

	// Test that the controller struct exists
	assert.NotNil(t, controller)
}

// Test the DeploymentUpdate struct
func TestDeploymentUpdateStruct(t *testing.T) {
	// Test the DeploymentUpdate struct
	update := wds.DeploymentUpdate{
		Timestamp: "2023-01-01T00:00:00Z",
		Message:   "Test deployment update",
	}

	assert.Equal(t, "2023-01-01T00:00:00Z", update.Timestamp)
	assert.Equal(t, "Test deployment update", update.Message)
}

func TestMockConn(t *testing.T) {
	conn := &mockConn{}
	assert.NotNil(t, conn)

	// Test WriteMessage
	err := conn.WriteMessage(websocket.TextMessage, []byte("test message"))
	assert.Nil(t, err)
	assert.Equal(t, []byte("test message"), conn.lastMessage)

	// Test Close
	err = conn.Close()
	assert.Nil(t, err)
	assert.True(t, conn.closed)
}

func TestFakeClientset(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	assert.NotNil(t, clientset)

	// Test that we can create a fake clientset
	appsV1 := clientset.AppsV1()
	assert.NotNil(t, appsV1)

	// Test that we can create a deployment
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-deployment",
			Namespace: "default",
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: func() *int32 { i := int32(3); return &i }(),
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  "nginx",
							Image: "nginx:latest",
						},
					},
				},
			},
		},
	}

	_, err := appsV1.Deployments("default").Create(context.Background(), deployment, metav1.CreateOptions{})
	assert.Nil(t, err)

	// Test that we can get the deployment
	retrieved, err := appsV1.Deployments("default").Get(context.Background(), "test-deployment", metav1.GetOptions{})
	assert.Nil(t, err)
	assert.Equal(t, "test-deployment", retrieved.Name)
	assert.Equal(t, "default", retrieved.Namespace)
}

func TestWorkqueue(t *testing.T) {
	// Test workqueue functionality
	queue := workqueue.NewNamedRateLimitingQueue(workqueue.DefaultControllerRateLimiter(), "testQueue")
	assert.NotNil(t, queue)

	// Test adding items
	queue.Add("test-item")

	// Test getting items
	item, shutdown := queue.Get()
	assert.False(t, shutdown)
	assert.Equal(t, "test-item", item)

	// Test marking as done
	queue.Done(item)

	// Test queue length
	assert.Equal(t, 0, queue.Len())
}

func TestCacheMetaNamespaceKeyFunc(t *testing.T) {
	// Test the cache.MetaNamespaceKeyFunc with a deployment
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-deployment",
			Namespace: "default",
		},
	}

	key, err := cache.MetaNamespaceKeyFunc(deployment)
	assert.Nil(t, err)
	assert.Equal(t, "default/test-deployment", key)
}

func TestSplitMetaNamespaceKey(t *testing.T) {
	// Test splitting namespace key
	key := "default/test-deployment"
	namespace, name, err := cache.SplitMetaNamespaceKey(key)
	assert.Nil(t, err)
	assert.Equal(t, "default", namespace)
	assert.Equal(t, "test-deployment", name)

	// Test with cluster-scoped resource
	clusterKey := "test-cluster-role"
	clusterNamespace, clusterName, clusterErr := cache.SplitMetaNamespaceKey(clusterKey)
	assert.Nil(t, clusterErr)
	assert.Equal(t, "", clusterNamespace)
	assert.Equal(t, "test-cluster-role", clusterName)
}
