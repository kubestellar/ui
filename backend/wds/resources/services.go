package resources

import (
	corev1 "k8s.io/api/core/v1"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
)

type Label struct {
	Component string `json:"component"`
	Provider  string `json:"provider"`
}
type MetaDataDetail struct {
	Name              string    `json:"name"`
	Namespace         string    `json:"namespace"`
	Uid               string    `json:"uid"`
	ResourceVersion   string    `json:"resourceVersion"`
	CreationTimestamp time.Time `json:"creationTimestamp"`
	Labels            Label     `json:"labels,omitempty"`
	ManagedFields     []struct {
		Manager    string    `json:"manager"`
		Operation  string    `json:"operation"`
		ApiVersion string    `json:"apiVersion"`
		Time       time.Time `json:"time"`
		FieldsType string    `json:"fieldsType"`
	} `json:"managedFields"`
}

type Status struct {
	LoadBalancer corev1.LoadBalancerStatus `json:"loadBalancer,omitempty"`
}
type ServiceDetail struct {
	Metadata MetaDataDetail `json:"metadata"`
	Status   Status         `json:"status"`
}

func helperServiceDetails(service corev1.Service) ServiceDetail {
	serviceDetail := ServiceDetail{
		Metadata: MetaDataDetail{
			Name:              service.Name,
			Namespace:         service.Namespace,
			Uid:               string(service.UID),
			ResourceVersion:   service.ResourceVersion,
			CreationTimestamp: service.CreationTimestamp.Time,
			ManagedFields: make([]struct {
				Manager    string    `json:"manager"`
				Operation  string    `json:"operation"`
				ApiVersion string    `json:"apiVersion"`
				Time       time.Time `json:"time"`
				FieldsType string    `json:"fieldsType"`
			}, len(service.ManagedFields)),
		},
		Status: struct {
			LoadBalancer corev1.LoadBalancerStatus `json:"loadBalancer,omitempty"`
		}{
			LoadBalancer: service.Status.LoadBalancer,
		},
	}
	if service.Labels != nil {
		serviceDetail.Metadata.Labels.Component = service.Labels["component"]
		serviceDetail.Metadata.Labels.Provider = service.Labels["provider"]
	}

	// Copy managed fields
	for i, field := range service.ManagedFields {
		serviceDetail.Metadata.ManagedFields[i] = struct {
			Manager    string    `json:"manager"`
			Operation  string    `json:"operation"`
			ApiVersion string    `json:"apiVersion"`
			Time       time.Time `json:"time"`
			FieldsType string    `json:"fieldsType"`
		}{
			Manager:    field.Manager,
			Operation:  string(field.Operation),
			ApiVersion: field.APIVersion,
			Time:       field.Time.Time,
			FieldsType: field.FieldsType,
		}
	}
	return serviceDetail
}

func GetServiceList(ctx *gin.Context) {
	namespace := ctx.Param("namespace")

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	var ListEverything = metav1.ListOptions{
		LabelSelector: labels.Everything().String(),
		FieldSelector: fields.Everything().String(),
	}
	services, err := clientset.CoreV1().Services(namespace).List(ctx, ListEverything)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Services not found", "err": err.Error()})
		return
	}

	var servicesList []ServiceDetail
	for _, service := range services.Items {
		serviceDetail := helperServiceDetails(service)
		servicesList = append(servicesList, serviceDetail)
	}

	ctx.JSON(http.StatusOK, gin.H{
		"services": servicesList,
	})
}

func GetServiceByServiceName(ctx *gin.Context) {
	name := ctx.Param("name")
	namespace := ctx.Param("namespace")
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	services, err := clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Services not found", "err": err.Error()})
		return
	}
	serviceDetail := helperServiceDetails(*services)

	ctx.JSON(http.StatusAccepted, gin.H{
		"service": serviceDetail,
	})

}
