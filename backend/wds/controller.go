package wds

// DOCS: https://github.com/kubernetes/sample-controller/blob/master/controller.go#L110-L114
// DOCS: https://medium.com/speechmatics/how-to-write-kubernetes-custom-controllers-in-go-8014c4a04235

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/wait"
	appsinformers "k8s.io/client-go/informers/apps/v1"
	"k8s.io/client-go/kubernetes"
	appslisters "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"
)

type Controller struct {
	clientset         kubernetes.Interface
	deploymentsLister appslisters.DeploymentLister
	deploymentsSynced cache.InformerSynced
	//workqueue         workqueue.TypedRateLimitingInterface[cache.ObjectName]
	workqueue workqueue.RateLimitingInterface
	conn      *websocket.Conn
}

func NewController(clientset kubernetes.Interface,
	deploymentInformer appsinformers.DeploymentInformer, conn *websocket.Conn) *Controller {
	/*
		DOCS: https://github.com/kubernetes/sample-controller/blob/8ab9f14766821df256ea5234629493d2b66ab89d/controller.go#L110-L114
			ratelimiter := workqueue.NewTypedMaxOfRateLimiter(
				workqueue.NewTypedItemExponentialFailureRateLimiter[cache.ObjectName](5*time.Minute, 1000*time.Second),
				&workqueue.TypedBucketRateLimiter[cache.ObjectName]{Limiter: rate.NewLimiter(rate.Limit(50), 300)})
	*/
	controller := &Controller{
		clientset:         clientset,
		deploymentsLister: deploymentInformer.Lister(),
		deploymentsSynced: deploymentInformer.Informer().HasSynced,
		workqueue:         workqueue.NewNamedRateLimitingQueue(workqueue.DefaultControllerRateLimiter(), "deploymentQueue"),
		conn:              conn,
	}

	// Set up an event handler for when Deployment resources change
	_, err := deploymentInformer.Informer().AddEventHandler(
		cache.ResourceEventHandlerFuncs{
			AddFunc:    controller.handleAdd,
			UpdateFunc: controller.handleUpdate,
			DeleteFunc: controller.handleDel,
		})
	if err != nil {
		log.Fatalf("Failed to register event handler: %v", err)
	}
	return controller
}

func (c *Controller) Run(ch <-chan struct{}) {
	fmt.Printf("starting controller")
	if !cache.WaitForCacheSync(ch, c.deploymentsSynced) {
		fmt.Printf("failed to wait for caches to sync")
	}
	go wait.Until(c.worker, 1*time.Second, ch)
	<-ch
	c.conn.Close()
}
func (c *Controller) worker() {
	for c.processItem() {

	}
}

func (c *Controller) processItem() bool {
	objRef, shutdown := c.workqueue.Get()
	if shutdown {
		return false
	}
	// we do not process the item again
	defer c.workqueue.Done(objRef)
	key, err := cache.MetaNamespaceKeyFunc(objRef)
	if err != nil {
		fmt.Printf("key and err, %s\n", err.Error())
	}
	namespace, name, err := cache.SplitMetaNamespaceKey(key)
	if err != nil {
		fmt.Printf("spliting namespace and name, %s\n", err.Error())
	}

	deployment, err := c.deploymentsLister.Deployments(namespace).Get(name)
	if err != nil {
		if errors.IsNotFound(err) {
			klog.V(4).Infof("Deployment %s has been deleted", key)
			c.conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Deployment %s has been deleted", key)))
			return true
		}
		klog.Errorf("Error syncing deployment %s: %v", key, err)
		c.conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Error: syncing deployment %s: %v ", key, err)))
		c.workqueue.AddRateLimited(objRef)
		return true
	}
	log.Printf("Successfully processed deployment: %s", deployment.Name)
	c.conn.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf("Successfully processed deployment: %s", deployment.Name)))
	return true
}

// will trigger how much deployment you have and when you create new one
func (c *Controller) handleAdd(obj interface{}) {
	c.workqueue.Add(obj)
}

// most important
func (c *Controller) handleUpdate(oldObj, newObj interface{}) {
	newDepl, ok1 := newObj.(*appsv1.Deployment)
	oldDepl, ok2 := oldObj.(*appsv1.Deployment)
	if !ok1 || !ok2 {
		return
	}
	if newDepl.ResourceVersion == oldDepl.ResourceVersion {
		// Periodic resync will send update events for all known Deployments.
		// Two different versions of the same Deployment will always have different RVs.
		return
	}
	c.updateLogs(newDepl, oldDepl)
	c.workqueue.Add(newObj)
}

func (c *Controller) handleDel(obj interface{}) {
	deployment, ok := obj.(*appsv1.Deployment)
	if !ok {
		return
	}
	message := fmt.Sprintf("Deployment %s deleted", deployment.Name)
	log.Println(message)
	c.conn.WriteMessage(websocket.TextMessage, []byte(message))
	c.workqueue.Add(obj)
}

type DeploymentUpdate struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

/*
Current we only look for - Replica and Image
In future we will extend it
*/
func (c *Controller) updateLogs(newDeployment, oldDeployment *appsv1.Deployment) {
	var logs []DeploymentUpdate
	if *oldDeployment.Spec.Replicas != *newDeployment.Spec.Replicas {
		logs = append(logs, DeploymentUpdate{
			Timestamp: time.Now().Format(time.RFC3339),
			Message:   fmt.Sprintf("Deployment %s updated - Replicas changed: %d", newDeployment.Name, *newDeployment.Spec.Replicas),
		})
		fmt.Println(logs)
	}
	oldImage := oldDeployment.Spec.Template.Spec.Containers[0].Image
	newImage := newDeployment.Spec.Template.Spec.Containers[0].Image

	if oldImage != newImage {
		logs = append(logs, DeploymentUpdate{
			Timestamp: time.Now().Format(time.RFC3339),
			Message:   fmt.Sprintf("Deployment %s updated - Image changed: %s", newDeployment.Name, newImage),
		})
		fmt.Println(logs)
	}
	for _, logLine := range logs {
		jsonMessage, _ := json.Marshal(logLine)
		fmt.Println(string(jsonMessage))
		if err := c.conn.WriteMessage(websocket.TextMessage, jsonMessage); err != nil {
			log.Println("WebSocket write error:", err)
			return
		}
	}
}
