package wds_test

import (
	"testing"

	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/kubernetes/fake"
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

// Mock informer for testing
type mockDeploymentInformer struct{}

func (m *mockDeploymentInformer) Lister() interface{} {
	return nil
}

func (m *mockDeploymentInformer) Informer() interface{} {
	return &mockInformer{}
}

type mockInformer struct{}

func (m *mockInformer) HasSynced() bool {
	return true
}

func (m *mockInformer) AddEventHandler(handler interface{}) (interface{}, error) {
	return nil, nil
}

func TestControllerMockConn(t *testing.T) {
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

func TestMockDeploymentInformer(t *testing.T) {
	informer := &mockDeploymentInformer{}
	assert.NotNil(t, informer)

	lister := informer.Lister()
	assert.Nil(t, lister)

	info := informer.Informer()
	assert.NotNil(t, info)

	// Fix the type assertion by using the correct variable name
	hasSynced := info.(*mockInformer).HasSynced()
	assert.True(t, hasSynced)
}

func TestFakeClientset(t *testing.T) {
	clientset := fake.NewSimpleClientset()
	assert.NotNil(t, clientset)

	// Test that we can create a fake clientset
	appsV1 := clientset.AppsV1()
	assert.NotNil(t, appsV1)
}
