package wds

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/k8s"
	"github.com/kubestellar/ui/redis"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
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

func getCacheKey(context, dataType string, parts ...string) string {
	return fmt.Sprintf("%s:%s:%s", context, dataType, strings.Join(parts, ":"))
}

var cachedResources []*metav1.APIResourceList
var cachedResourcesKey = "preferredResources-list"

// ListAllResourcesDetails api/wds/list
const MaxConcurrentCalls = 20

func ListAllResourcesDetails(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	cacheKey := getCacheKey(cookieContext, "list")

	type ResourceListResponse struct {
		Namespaced    map[string]map[string][]map[string]interface{} `json:"namespaced"`
		ClusterScoped map[string][]map[string]interface{}            `json:"clusterScoped"`
	}
	result := ResourceListResponse{
		Namespaced:    make(map[string]map[string][]map[string]interface{}),
		ClusterScoped: make(map[string][]map[string]interface{}),
	}

	found, err := redis.GetJSONValue(cacheKey, &result)
	if err == nil && found && len(result.Namespaced) > 0 {
		c.JSON(http.StatusOK, gin.H{"data": result})
		return
	}

	clientset, dynamicClient, err := k8s.GetClientSetWithContext(cookieContext)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	discoveryClient := clientset.Discovery()

	found, err = redis.GetJSONValue(cachedResourcesKey, &cachedResources)
	if err != nil {
		log.Printf("Error fetching API resource cache: %v", err)
	}
	if !found {
		cachedResources, err = discoveryClient.ServerPreferredResources()
		if err != nil {
			log.Fatalf("Failed to fetch API resources: %v", err)
		}
		err = redis.SetJSONValue(cachedResourcesKey, cachedResources, 5*time.Minute)
	}

	resourceList := cachedResources

	nsList, err := dynamicClient.Resource(schema.GroupVersionResource{
		Group: "", Version: "v1", Resource: "namespaces",
	}).List(c, metav1.ListOptions{})
	if err != nil {
		log.Fatalf("Failed to list namespaces: %v", err)
	}

	namespaceMeta := make(map[string]map[string]interface{})
	var namespaces []string
	for _, ns := range nsList.Items {
		nsName := ns.GetName()
		if strings.HasPrefix(nsName, "kube-") {
			continue
		}
		namespaces = append(namespaces, nsName)
		namespaceMeta[nsName] = extractNamespaceDetails(nsName, nsList.Items)
	}

	var wg sync.WaitGroup
	var mutex sync.Mutex
	sem := make(chan struct{}, MaxConcurrentCalls)

	for _, resList := range resourceList {
		gv, err := schema.ParseGroupVersion(resList.GroupVersion)
		if err != nil {
			continue
		}
		for _, res := range resList.APIResources {
			if _, ok := popularKinds[res.Kind]; !ok || strings.Contains(res.Name, "/") || !contains(res.Verbs, "list") {
				continue
			}

			gvr := schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: res.Name}

			if res.Namespaced {
				for _, ns := range namespaces {
					wg.Add(1)
					sem <- struct{}{}
					go func(ns string, gvr schema.GroupVersionResource, kind string) {
						defer func() {
							<-sem
							wg.Done()
						}()

						ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
						defer cancel()

						objs, err := dynamicClient.Resource(gvr).Namespace(ns).List(ctx, metav1.ListOptions{})
						if err != nil || len(objs.Items) == 0 {
							return
						}
						mutex.Lock()
						defer mutex.Unlock()
						nsMap := result.Namespaced
						if nsMap[ns] == nil {
							nsMap[ns] = map[string][]map[string]interface{}{
								"__namespaceMetaData": {extractNamespaceDetails(ns, nsList.Items)},
							}
						}
						for _, obj := range objs.Items {
							nsMap[ns][res.Kind] = append(nsMap[ns][res.Kind], extractObjDetails(&obj))
						}
					}(ns, gvr, res.Kind)
				}
			} else {
				wg.Add(1)
				sem <- struct{}{}
				go func(gvr schema.GroupVersionResource, kind string) {
					defer func() {
						<-sem
						wg.Done()
					}()

					ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					defer cancel()

					objs, err := dynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})
					if err != nil || len(objs.Items) == 0 {
						return
					}
					mutex.Lock()
					defer mutex.Unlock()
					for _, obj := range objs.Items {
						result.ClusterScoped[res.Kind] = append(result.ClusterScoped[res.Kind], extractObjDetails(&obj))
					}
				}(gvr, res.Kind)
			}
		}
	}
	wg.Wait()

	err = redis.SetJSONValue(cacheKey, result, 2*time.Minute)
	if err != nil {
		log.Printf("Error caching list view details data: %v", err)
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// ListAllResourcesByNamespace api/wds/list/:namespace
func ListAllResourcesByNamespace(c *gin.Context) {
	cookieContext, err := c.Cookie("ui-wds-context")
	if err != nil {
		cookieContext = "wds1"
	}
	clientset, dynamicClient, err := k8s.GetClientSetWithContext(cookieContext)
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
	type ResourceListResponse struct {
		Namespaced map[string]map[string][]map[string]interface{} `json:"namespaced"`
	}
	result := ResourceListResponse{
		Namespaced: make(map[string]map[string][]map[string]interface{}),
	}
	cacheKey := getCacheKey(cookieContext, "list", nsName)
	found, err := redis.GetJSONValue(cacheKey, &result)
	if err != nil {
		log.Printf("Error retrieving list view ns details data from cache: %v", err)
	} else if found && len(result.Namespaced) > 0 {
		c.JSON(http.StatusOK, gin.H{
			"data": result,
		})
		return
	}
	found, err = redis.GetJSONValue(cachedResourcesKey, &cachedResources)
	if err != nil {
		log.Printf("Error fetching API resource cache: %v", err)
	}
	if !found {
		cachedResources, err = discoveryClient.ServerPreferredResources()
		if err != nil {
			log.Fatalf("Failed to fetch API resources: %v", err)
		}
		err = redis.SetJSONValue(cachedResourcesKey, cachedResources, 5*time.Minute)
		if err != nil {
			log.Printf("Failed to set API resource cache: %v", err)
		}
	}
	resourceList := cachedResources

	for _, resList := range resourceList {
		gv, err := schema.ParseGroupVersion(resList.GroupVersion)
		if err != nil {
			continue
		}
		for _, res := range resList.APIResources {
			if _, ok := popularKinds[res.Kind]; !ok || strings.Contains(res.Name, "/") || !contains(res.Verbs, "list") {
				continue
			}
			gvr := schema.GroupVersionResource{Group: gv.Group, Version: gv.Version, Resource: res.Name}
			if res.Namespaced {
				objs, err := dynamicClient.Resource(gvr).Namespace(nsName).List(c, metav1.ListOptions{})
				if err != nil {
					continue
				}
				nsMap := result.Namespaced
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
	err = redis.SetJSONValue(cacheKey, result, 2*time.Minute)
	if err != nil {
		log.Printf("Error caching list view namespaces details data: %v", err)
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
