package resources

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
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

/*
	   -> DOCS: https://kubernetes.io/docs/concepts/services-networking/service/

		Labels: map[string]string{
		    "app.kubernetes.io/name": "MyApp",
		    "app.kubernetes.io/instance": "myapp-1",
		    "app.kubernetes.io/version": "1.0.0",
		    "app.kubernetes.io/component": "frontend",
		    "app.kubernetes.io/part-of": "myapp",
		    "app.kubernetes.io/managed-by": "manual",
		}
*/
func CreateService(ctx *gin.Context) {
	type ServicePort struct {
		Name       string `json:"name"`
		Port       int32  `json:"port"`
		TargetPort int32  `json:"targetPort"`
		Protocol   string `json:"protocol"`
	}
	type Parameters struct {
		Namespace string            `json:"namespace"`
		Name      string            `json:"name"`
		Labels    map[string]string `json:"labels"`
		Ports     []ServicePort     `json:"ports"`
	}
	var params Parameters
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if params.Name == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "enter name of the deployment"})
		return
	}

	if params.Namespace == "" {
		params.Namespace = "default"
	}
	if params.Labels == nil {
		params.Labels = map[string]string{
			"app.kubernetes.io/name": params.Name,
		}
	}

	if len(params.Ports) == 0 {
		// default ports
		params.Ports = []ServicePort{
			{
				Name:       "http",
				Port:       80,
				TargetPort: 9376,
				Protocol:   "TCP",
			},
		}
	}
	var servicePorts []corev1.ServicePort

	// Important: You need to convert the user given data to k8s formats
	for _, p := range params.Ports {
		if p.Port <= 0 || p.Port > 65535 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid port number. Must be between 1-65535."})
			return
		}
		protocol := corev1.ProtocolTCP
		if p.Protocol != "" {
			protocol = corev1.Protocol(p.Protocol)
		}
		servicePorts = append(servicePorts, corev1.ServicePort{
			Name:       p.Name,
			Port:       p.Port,
			TargetPort: intstr.FromInt(int(p.TargetPort)),
			Protocol:   protocol,
		})
	}
	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      params.Name,
			Namespace: params.Namespace,
			Labels:    params.Labels,
		},
		Spec: corev1.ServiceSpec{
			Selector: params.Labels,
			Ports:    servicePorts,
		},
	}
	createdService, err := clientset.CoreV1().Services("default").Create(ctx, service, metav1.CreateOptions{})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create service",
			"err":     err,
		})
		return
	}

	ctx.JSON(http.StatusAccepted, gin.H{
		"message":    "Service created successfully!",
		"deployment": createdService,
	})
}

func DeleteService(ctx *gin.Context) {
	type parameters struct {
		Namespace string `json:"namespace"`
		Name      string `json:"name"`
	}
	params := parameters{}
	if err := ctx.ShouldBindJSON(&params); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if params.Namespace == "" {
		params.Namespace = "default"
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to create Kubernetes clientset",
			"err":     err,
		})
		return
	}
	err = clientset.CoreV1().Services(params.Namespace).Delete(ctx, params.Name, metav1.DeleteOptions{})
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "failed to delete service",
			"error":   err.Error(),
		})
		return
	}
	ctx.JSON(http.StatusAccepted, gin.H{
		"name":    params.Name,
		"message": "Successfully deleted service",
	})
}
