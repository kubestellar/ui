package bp

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/kubestellar/api/control/v1alpha1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
)

// Mock client for testing
type MockBindingPolicyClient struct {
	mock.Mock
}

func (m *MockBindingPolicyClient) Create(ctx context.Context, bp *v1alpha1.BindingPolicy, opts v1.CreateOptions) (*v1alpha1.BindingPolicy, error) {
	args := m.Called(ctx, bp, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicy), args.Error(1)
}

func (m *MockBindingPolicyClient) Delete(ctx context.Context, name string, opts v1.DeleteOptions) error {
	args := m.Called(ctx, name, opts)
	return args.Error(0)
}

func (m *MockBindingPolicyClient) DeleteCollection(ctx context.Context, opts v1.DeleteOptions, listOpts v1.ListOptions) error {
	args := m.Called(ctx, opts, listOpts)
	return args.Error(0)
}

func (m *MockBindingPolicyClient) Get(ctx context.Context, name string, opts v1.GetOptions) (*v1alpha1.BindingPolicy, error) {
	args := m.Called(ctx, name, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicy), args.Error(1)
}

func (m *MockBindingPolicyClient) List(ctx context.Context, opts v1.ListOptions) (*v1alpha1.BindingPolicyList, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicyList), args.Error(1)
}

func (m *MockBindingPolicyClient) Patch(ctx context.Context, name string, pt types.PatchType, data []byte, opts v1.PatchOptions, subresources ...string) (*v1alpha1.BindingPolicy, error) {
	args := m.Called(ctx, name, pt, data, opts, subresources)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicy), args.Error(1)
}

func (m *MockBindingPolicyClient) Update(ctx context.Context, bp *v1alpha1.BindingPolicy, opts v1.UpdateOptions) (*v1alpha1.BindingPolicy, error) {
	args := m.Called(ctx, bp, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicy), args.Error(1)
}

func (m *MockBindingPolicyClient) UpdateStatus(ctx context.Context, bp *v1alpha1.BindingPolicy, opts v1.UpdateOptions) (*v1alpha1.BindingPolicy, error) {
	args := m.Called(ctx, bp, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*v1alpha1.BindingPolicy), args.Error(1)
}

func (m *MockBindingPolicyClient) Watch(ctx context.Context, opts v1.ListOptions) (watch.Interface, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(watch.Interface), args.Error(1)
}

// Global variable to store the mock client
var mockClient *MockBindingPolicyClient

// Middleware to inject mock client
func injectMockClient() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("bindingPolicyClient", mockClient)
		c.Next()
	}
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	return router
}

// Helper to reset global state
func resetGlobalState() {
	uiCreatedPolicies = make(map[string]*StoredBindingPolicy)
}

func TestGetAllBp(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Setup test data
	testPolicies := &v1alpha1.BindingPolicyList{
		Items: []v1alpha1.BindingPolicy{
			{
				TypeMeta: v1.TypeMeta{
					Kind:       "BindingPolicy",
					APIVersion: "control.kubestellar.io/v1alpha1",
				},
				ObjectMeta: v1.ObjectMeta{
					Name:      "test-policy-1",
					Namespace: "default",
				},
				Spec: v1alpha1.BindingPolicySpec{
					ClusterSelectors: []v1.LabelSelector{
						{
							MatchLabels: map[string]string{
								"kubernetes.io/cluster-name": "cluster1",
							},
						},
					},
				},
			},
		},
	}

	// Setup mock expectations
	mockClient.On("List", mock.Anything, mock.Anything).Return(testPolicies, nil)

	// Setup route
	router.GET("/api/bp", injectMockClient(), GetAllBp)

	// Create test request
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/bp", nil)
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "bindingPolicies")
}

func TestCreateBp(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Test data
	testPolicy := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			Kind:       "BindingPolicy",
			APIVersion: "control.kubestellar.io/v1alpha1",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      "test-policy",
			Namespace: "default",
		},
		Spec: v1alpha1.BindingPolicySpec{
			ClusterSelectors: []v1.LabelSelector{
				{
					MatchLabels: map[string]string{
						"kubernetes.io/cluster-name": "cluster1",
					},
				},
			},
		},
	}

	// Setup mock expectations
	mockClient.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(testPolicy, nil)

	// Setup route
	router.POST("/api/bp/create", injectMockClient(), CreateBp)

	// Create test request
	policyYAML := `apiVersion: control.kubestellar.io/v1alpha1
kind: BindingPolicy
metadata:
  name: test-policy
  namespace: default
spec:
  clusterSelectors:
  - matchLabels:
      kubernetes.io/cluster-name: cluster1`

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/bp/create", bytes.NewBufferString(policyYAML))
	req.Header.Set("Content-Type", "application/yaml")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "message")
}

func TestDeleteBp(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Setup mock expectations
	mockClient.On("Delete", mock.Anything, "test-policy", mock.Anything).Return(nil)

	// Setup route
	router.DELETE("/api/bp/delete/:name", injectMockClient(), DeleteBp)

	// Create test request
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/api/bp/delete/test-policy", nil)
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "message")
}

func TestGetBpStatus(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Use a unique policy name for this test
	policyName := "test-policy-status"
	// Test data
	testPolicy := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			Kind:       "BindingPolicy",
			APIVersion: "control.kubestellar.io/v1alpha1",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      policyName,
			Namespace: "default",
		},
		Status: v1alpha1.BindingPolicyStatus{
			Conditions: []v1alpha1.BindingPolicyCondition{
				{
					Type:   "Ready",
					Status: "True",
				},
			},
		},
	}

	// Setup mock expectations
	mockClient.On("Get", mock.Anything, policyName, mock.Anything).Return(testPolicy, nil)
	mockClient.On("List", mock.Anything, mock.Anything).Return(&v1alpha1.BindingPolicyList{Items: []v1alpha1.BindingPolicy{*testPolicy}}, nil)

	// Setup route
	router.GET("/api/bp/status", injectMockClient(), GetBpStatus)

	// Create test request
	w := httptest.NewRecorder()
	url := "/api/bp/status?name=" + policyName
	req, _ := http.NewRequest("GET", url, nil)
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "status")
}

func TestCreateQuickBindingPolicy(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Use a unique policy name for this test
	policyName := "quick-test-policy-unique"
	// Test data
	testPolicy := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			Kind:       "BindingPolicy",
			APIVersion: "control.kubestellar.io/v1alpha1",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      policyName,
			Namespace: "default",
		},
		Spec: v1alpha1.BindingPolicySpec{
			ClusterSelectors: []v1.LabelSelector{
				{
					MatchLabels: map[string]string{
						"kubernetes.io/cluster-name": "cluster1",
					},
				},
			},
		},
	}

	// Setup mock expectations
	mockClient.On("Create", mock.Anything, mock.Anything, mock.Anything).Return(testPolicy, nil)

	// Setup route
	router.POST("/api/bp/quick-create", injectMockClient(), CreateQuickBindingPolicy)

	// Create test request
	requestBody := map[string]interface{}{
		"workloadLabels": map[string]string{
			"app": "test-app",
		},
		"clusterLabels": map[string]string{
			"kubernetes.io/cluster-name": "cluster1",
		},
		"resources": []map[string]interface{}{
			{
				"type":       "deployments",
				"createOnly": false,
				"apiGroup":   "apps",
			},
		},
		"namespacesToSync": []string{"default"},
		"policyName":       policyName,
		"namespace":        "default",
	}

	requestJSON, _ := json.Marshal(requestBody)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/bp/quick-create", bytes.NewBuffer(requestJSON))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "message")
}

func TestUpdateBp(t *testing.T) {
	resetGlobalState()
	router := setupTestRouter()
	mockClient = new(MockBindingPolicyClient)

	// Use a unique policy name for this test
	policyName := "test-policy-update"
	// Test data
	testPolicy := &v1alpha1.BindingPolicy{
		TypeMeta: v1.TypeMeta{
			Kind:       "BindingPolicy",
			APIVersion: "control.kubestellar.io/v1alpha1",
		},
		ObjectMeta: v1.ObjectMeta{
			Name:      policyName,
			Namespace: "default",
		},
		Spec: v1alpha1.BindingPolicySpec{
			ClusterSelectors: []v1.LabelSelector{
				{
					MatchLabels: map[string]string{
						"kubernetes.io/cluster-name": "cluster1",
					},
				},
			},
		},
	}

	// Setup mock expectations
	mockClient.On("Get", mock.Anything, policyName, mock.Anything).Return(testPolicy, nil)
	mockClient.On("Patch", mock.Anything, policyName, mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(testPolicy, nil)
	mockClient.On("List", mock.Anything, mock.Anything).Return(&v1alpha1.BindingPolicyList{Items: []v1alpha1.BindingPolicy{*testPolicy}}, nil)

	// Setup route
	router.PATCH("/api/bp/update/:name", injectMockClient(), UpdateBp)

	// Create test request
	patchData := map[string]interface{}{
		"spec": map[string]interface{}{
			"clusterSelectors": []map[string]interface{}{
				{
					"matchLabels": map[string]string{
						"kubernetes.io/cluster-name": "cluster1",
					},
				},
			},
		},
	}

	patchJSON, _ := json.Marshal(patchData)
	w := httptest.NewRecorder()
	url := "/api/bp/update/" + policyName
	req, _ := http.NewRequest("PATCH", url, bytes.NewBuffer(patchJSON))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response, "message")
}
