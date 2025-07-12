package deployment

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/wds/deployment"
	"github.com/stretchr/testify/assert"
)

func TestWorkloadInfo(t *testing.T) {
	workload := deployment.WorkloadInfo{
		Name:      "test-deployment",
		Kind:      "Deployment",
		Namespace: "default",
		Labels:    map[string]string{"app": "test"},
	}

	// Test struct fields
	assert.Equal(t, "test-deployment", workload.Name)
	assert.Equal(t, "Deployment", workload.Kind)
	assert.Equal(t, "default", workload.Namespace)
	assert.Equal(t, "test", workload.Labels["app"])
}

func TestGetDeploymentByName(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		deploymentName string
		namespace      string
		expectedStatus int
	}{
		{
			name:           "Valid deployment name with namespace",
			deploymentName: "test-deployment",
			namespace:      "default",
			expectedStatus: http.StatusBadRequest, // Expected to fail due to no k8s connection
		},
		{
			name:           "Valid deployment name without namespace",
			deploymentName: "test-deployment",
			namespace:      "",
			expectedStatus: http.StatusBadRequest, // Expected to fail due to no k8s connection
		},
		{
			name:           "Empty deployment name",
			deploymentName: "",
			namespace:      "default",
			expectedStatus: http.StatusBadRequest, // Expected to fail due to no k8s connection
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			url := "/api/wds/" + tt.deploymentName
			if tt.namespace != "" {
				url += "?namespace=" + tt.namespace
			}

			req := httptest.NewRequest("GET", url, nil)
			c.Request = req
			c.Params = []gin.Param{{Key: "name", Value: tt.deploymentName}}

			deployment.GetDeploymentByName(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestGetWDSWorkloads(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		namespace      string
		setCookie      bool
		cookieValue    string
		expectedStatus int
	}{
		{
			name:           "Get workloads with namespace and cookie",
			namespace:      "default",
			setCookie:      true,
			cookieValue:    "wds1",
			expectedStatus: http.StatusBadRequest, // Expected to fail due to no k8s connection
		},
		{
			name:           "Get workloads without namespace",
			namespace:      "",
			setCookie:      true,
			cookieValue:    "wds1",
			expectedStatus: http.StatusBadRequest, //  Expected to fail due to no k8s connection
		},
		{
			name:           "Get workloads without cookie",
			namespace:      "default",
			setCookie:      false,
			expectedStatus: http.StatusBadRequest, // Expected to fail due to no k8s connection
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			url := "/api/wds/workloads"
			if tt.namespace != "" {
				url += "?namespace=" + tt.namespace
			}

			req := httptest.NewRequest("GET", url, nil)
			if tt.setCookie {
				req.AddCookie(&http.Cookie{
					Name:  "ui-wds-context",
					Value: tt.cookieValue,
				})
			}
			c.Request = req

			deployment.GetWDSWorkloads(c)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
