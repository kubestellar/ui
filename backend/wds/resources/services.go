package resources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/labels"
)

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

	ctx.JSON(http.StatusAccepted, gin.H{
		"services": services,
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

	ctx.JSON(http.StatusAccepted, gin.H{
		"name":              services.Name,
		"namespace":         services.Namespace,
		"uid":               services.UID,
		"creationTimestamp": services.CreationTimestamp.Time,
		"services":          services,
		"status":            services.Status,
	})

}
