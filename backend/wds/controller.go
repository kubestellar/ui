package wds

// DOCS: https://github.com/kubernetes/sample-controller/blob/master/controller.go#L110-L114
// DOCS: https://medium.com/speechmatics/how-to-write-kubernetes-custom-controllers-in-go-8014c4a04235

import (
	"fmt"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/wait"
	appsinformers "k8s.io/client-go/informers/apps/v1"
	"k8s.io/client-go/kubernetes"
	appslisters "k8s.io/client-go/listers/apps/v1"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/util/workqueue"
	"k8s.io/klog/v2"
	"time"
)

type Controller struct {
	clientset         kubernetes.Interface
	deploymentsLister appslisters.DeploymentLister
	deploymentsSynced cache.InformerSynced
	//workqueue         workqueue.TypedRateLimitingInterface[cache.ObjectName]
	workqueue workqueue.RateLimitingInterface
}

func NewController(clientset kubernetes.Interface,
	deploymentInformer appsinformers.DeploymentInformer) *Controller {

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
	}

	// Set up an event handler for when Deployment resources change
	deploymentInformer.Informer().AddEventHandler(
		cache.ResourceEventHandlerFuncs{
			AddFunc:    controller.handleAdd,
			UpdateFunc: controller.handleUpdate,
			DeleteFunc: controller.handleDel,
		})
	return controller
}

func (c *Controller) Run(ch <-chan struct{}) {
	fmt.Printf("starting controller")
	if !cache.WaitForCacheSync(ch, c.deploymentsSynced) {
		fmt.Printf("failed to wait for caches to sync")
	}
	go wait.Until(c.worker, 1*time.Second, ch)
	<-ch
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
			return true
		}
		klog.Errorf("Error syncing deployment %s: %v", key, err)
		c.workqueue.AddRateLimited(objRef)
		return true
	}
	klog.Infof("Successfully processed deployment: %s", deployment.Name)
	return true
}
func (c *Controller) handleAdd(obj interface{}) {
	fmt.Println("hello add is called")
	c.workqueue.Add(obj)
}

func (c *Controller) handleUpdate(oldObj, newObj interface{}) {
	newDepl := newObj.(*appsv1.Deployment)
	oldDepl := oldObj.(*appsv1.Deployment)
	if newDepl.ResourceVersion == oldDepl.ResourceVersion {
		// Periodic resync will send update events for all known Deployments.
		// Two different versions of the same Deployment will always have different RVs.
		return
	}
	fmt.Printf("Update triggered for %s/%s\n", newDepl.Namespace, newDepl.Name)
	c.workqueue.Add(newObj)
}
func (c *Controller) handleDel(obj interface{}) {
	fmt.Println("hello del is called")
	c.workqueue.Add(obj)
}
