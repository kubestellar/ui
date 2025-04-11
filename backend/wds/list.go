package wds

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"log"
	"net/http"
	"strings"
)

var popularKinds = map[string]bool{
	"Deployment":               true,
	"StatefulSet":              true,
	"DaemonSet":                true,
	"ReplicaSet":               true,
	"Pod":                      true,
	"Job":                      true,
	"CronJob":                  true,
	"Service":                  true,
	"Endpoints":                true,
	"Ingress":                  true,
	"ConfigMap":                true,
	"Secret":                   true,
	"PersistentVolumeClaim":    true,
	"Node":                     true,
	"PersistentVolume":         true,
	"StorageClass":             true,
	"CustomResourceDefinition": true,
	//"ClusterRole":              true,
	//"ClusterRoleBinding":       true,
	"Namespace":          true,
	"EndpointSlice":      true,
	"ControllerRevision": true,
}

// ListAllResourcesDetails api/wds/list
func ListAllResourcesDetails(c *gin.Context) {
	// TODO: add the cookies context
	// TODO: Optimize the endpoint response time
	// TODO: Redis Integration
	clientset, dynamicClient, err := k8s.GetClientSetWithContext("wds1")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	discoveryClient := clientset.Discovery()

	reqNamespace := []string{}
	nsList, err := dynamicClient.Resource(schema.GroupVersionResource{Group: "", Version: "v1", Resource: "namespaces"}).List(c, metav1.ListOptions{})
	if err != nil {
		log.Fatalf("Failed to list namespaces: %v", err)
	}
	for _, ns := range nsList.Items {
		nsName := ns.GetName()

		if strings.HasPrefix(nsName, "kube-") {
			continue
		}
		reqNamespace = append(reqNamespace, nsName)
	}
	result := map[string]interface{}{
		"namespaced":    map[string]map[string][]map[string]interface{}{},
		"clusterScoped": map[string][]map[string]interface{}{},
	}
	// give you all the resources
	resourceList, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		log.Fatalf("Failed to fetch API resources: %v", err)
	}

	for _, resList := range resourceList {
		gv, err := schema.ParseGroupVersion(resList.GroupVersion)
		if err != nil {
			continue
		}
		for _, res := range resList.APIResources {
			if !popularKinds[res.Kind] || strings.Contains(res.Name, "/") || !contains(res.Verbs, "list") {
				continue
			}
			gvr := schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: res.Name}

			if res.Namespaced {
				for _, ns := range reqNamespace {
					objs, err := dynamicClient.Resource(gvr).Namespace(ns).List(c, metav1.ListOptions{})
					if err != nil || len(objs.Items) == 0 {
						continue
					}
					nsMap := result["namespaced"].(map[string]map[string][]map[string]interface{})
					if nsMap[ns] == nil {
						nsMetaData := extractNamespaceDetails(ns, nsList.Items)
						nsMap[ns] = map[string][]map[string]interface{}{
							"__namespaceMetaData": {nsMetaData},
						}
					}

					for _, obj := range objs.Items {
						objDetails := extractObjDetails(&obj)
						nsMap[ns][res.Kind] = append(nsMap[ns][res.Kind], objDetails)
					}
				}
			} else {
				objs, err := dynamicClient.Resource(gvr).List(c, metav1.ListOptions{})
				if err != nil || len(objs.Items) == 0 {
					continue
				}
				clusterMap := result["clusterScoped"].(map[string][]map[string]interface{})
				for _, obj := range objs.Items {
					detail := extractObjDetails(&obj)
					clusterMap[res.Kind] = append(clusterMap[res.Kind], detail)
				}
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// ListAllResourcesByNamespace api/wds/list/:namespace
func ListAllResourcesByNamespace(c *gin.Context) {
	// TODO: add the cookies context
	clientset, dynamicClient, err := k8s.GetClientSetWithContext("wds1")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	discoveryClient := clientset.Discovery()
	nsName := c.Param("namespace")

	if nsName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "namespace is required param",
		})
	}
	result := map[string]interface{}{
		"namespaced": map[string]map[string][]map[string]interface{}{},
	}
	resourceList, err := discoveryClient.ServerPreferredResources()
	if err != nil {
		log.Fatalf("Failed to fetch API resources: %v", err)
	}

	for _, resList := range resourceList {
		gv, err := schema.ParseGroupVersion(resList.GroupVersion)
		if err != nil {
			continue
		}
		for _, res := range resList.APIResources {
			if !popularKinds[res.Kind] || strings.Contains(res.Name, "/") || !contains(res.Verbs, "list") {
				continue
			}
			gvr := schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: res.Name}
			if res.Namespaced {
				objs, err := dynamicClient.Resource(gvr).Namespace(nsName).List(c, metav1.ListOptions{})
				if err != nil {
					continue
				}
				nsMap := result["namespaced"].(map[string]map[string][]map[string]interface{})
				if nsMap[nsName] == nil {
					nsMap[nsName] = map[string][]map[string]interface{}{}
				}
				for _, obj := range objs.Items {
					objDetails := extractObjDetails(&obj)
					nsMap[nsName][res.Kind] = append(nsMap[nsName][res.Kind], objDetails)
				}

			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"data": result,
	})
}

// if it contains "list" then just ignore them
func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

func extractNamespaceDetails(nsName string, nsList []unstructured.Unstructured) map[string]interface{} {
	for _, ns := range nsList {
		if ns.GetName() == nsName {
			return map[string]interface{}{
				"name":   ns.GetName(),
				"labels": ns.GetLabels(),
				//"Annotations":       ns.GetAnnotations(),
				"createdAt": ns.GetCreationTimestamp().String(),
				//"status":            ns.Object["status"],
				"uid":     ns.GetUID(),
				"version": ns.GetAPIVersion(),
			}
		}
	}
	return map[string]interface{}{
		"name": nsName,
	}
}
func extractObjDetails(obj *unstructured.Unstructured) map[string]interface{} {
	details := map[string]interface{}{
		"name":      obj.GetName(),
		"namespace": obj.GetNamespace(),
		"kind":      obj.GetKind(),
		"version":   obj.GetAPIVersion(),
		"labels":    obj.GetLabels(),
		//"Annotations":       obj.GetAnnotations(),
		"createdAt": obj.GetCreationTimestamp().String(),
		//"OwnerReferences":   obj.GetOwnerReferences(),
		"uid": obj.GetUID(),
	}
	return details
}
