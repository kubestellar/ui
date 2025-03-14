package resources

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
)

type MetaDataDetail struct {
	Name              string            `json:"name"`
	Namespace         string            `json:"namespace"`
	Uid               string            `json:"uid"`
	ResourceVersion   string            `json:"resourceVersion"`
	CreationTimestamp time.Time         `json:"creationTimestamp"`
	Labels            map[string]string `json:"labels"`
	Annotations       map[string]string `json:"annotations"`
	ManagedFields     []struct {
		Manager    string    `json:"manager"`
		Operation  string    `json:"operation"`
		ApiVersion string    `json:"apiVersion"`
		Time       time.Time `json:"time"`
		FieldsType string    `json:"fieldsType"`
	} `json:"managedFields"`
}
type Spec struct {
	Ports                         []corev1.ServicePort                 `json:"ports"`
	Selector                      map[string]string                    `json:"selector"`
	ClusterIP                     string                               `json:"clusterIP"`
	ClusterIPs                    []string                             `json:"clusterIPs"`
	Type                          corev1.ServiceType                   `json:"type"`
	SessionAffinity               corev1.ServiceAffinity               `json:"sessionAffinity"`
	ExternalTrafficPolicy         corev1.ServiceExternalTrafficPolicy  `json:"externalTrafficPolicy"`
	IpFamilies                    []corev1.IPFamily                    `json:"ipFamilies"`
	IpFamilyPolicy                *corev1.IPFamilyPolicy               `json:"ipFamilyPolicy"`
	AllocateLoadBalancerNodePorts *bool                                `json:"allocateLoadBalancerNodePorts"`
	InternalTrafficPolicy         *corev1.ServiceInternalTrafficPolicy `json:"internalTrafficPolicy"`
}
type Status struct {
	LoadBalancer corev1.LoadBalancerStatus `json:"loadBalancer,omitempty"`
}
type ServiceDetail struct {
	Metadata MetaDataDetail `json:"metadata"`
	Status   Status         `json:"status"`
	Spec     Spec           `json:"spec"`
}

func helperServiceDetails(service corev1.Service) ServiceDetail {
	serviceDetail := ServiceDetail{
		Metadata: MetaDataDetail{
			Name:              service.Name,
			Namespace:         service.Namespace,
			Uid:               string(service.UID),
			ResourceVersion:   service.ResourceVersion,
			CreationTimestamp: service.CreationTimestamp.Time,
			Labels:            service.Labels,
			Annotations:       service.Annotations,
			ManagedFields: make([]struct {
				Manager    string    `json:"manager"`
				Operation  string    `json:"operation"`
				ApiVersion string    `json:"apiVersion"`
				Time       time.Time `json:"time"`
				FieldsType string    `json:"fieldsType"`
			}, len(service.ManagedFields)),
		},
		Spec: Spec{
			Ports:                         service.Spec.Ports,
			Selector:                      service.Spec.Selector,
			ClusterIP:                     service.Spec.ClusterIP,
			ClusterIPs:                    service.Spec.ClusterIPs,
			Type:                          service.Spec.Type,
			SessionAffinity:               service.Spec.SessionAffinity,
			ExternalTrafficPolicy:         service.Spec.ExternalTrafficPolicy,
			IpFamilies:                    service.Spec.IPFamilies,
			IpFamilyPolicy:                service.Spec.IPFamilyPolicy,
			AllocateLoadBalancerNodePorts: service.Spec.AllocateLoadBalancerNodePorts,
			InternalTrafficPolicy:         service.Spec.InternalTrafficPolicy,
		},
		Status: struct {
			LoadBalancer corev1.LoadBalancerStatus `json:"loadBalancer,omitempty"`
		}{
			LoadBalancer: service.Status.LoadBalancer,
		},
	}
	if service.Labels != nil {
		serviceDetail.Metadata.Labels = service.Labels
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
