package deployment

import (
	"context"
	"encoding/json"
	"fmt"
	"k8s.io/client-go/kubernetes"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/katamyra/kubestellarUI/wds"
	v1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type DeploymentUpdate struct {
	Timestamp string `json:"timestamp"`
	Message   string `json:"message"`
}

func HandleDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade Error:", err)
		return
	}
	defer conn.Close()

	namespace := r.URL.Query().Get("namespace")
	deploymentName := r.URL.Query().Get("deployment")

	if namespace == "" || deploymentName == "" {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Missing namespace or deployment name"))
		return
	}

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Failed to create Kubernetes clientset - "+err.Error()))
		return
	}

	sendInitialLogs(conn, clientset, namespace, deploymentName)

	watchDeploymentChanges(conn, clientset, namespace, deploymentName)
}

func sendInitialLogs(conn *websocket.Conn, clientset *kubernetes.Clientset, namespace, deploymentName string) {
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.Background(), deploymentName, metav1.GetOptions{})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Failed to fetch deployment - "+err.Error()))
		return
	}

	logs := getDeploymentLogs(deployment)
	for _, logLine := range logs {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(logLine)); err != nil {
			log.Println("Error writing to WebSocket:", err)
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
}

// Watches deployment changes and sends updates
func watchDeploymentChanges(conn *websocket.Conn, clientset *kubernetes.Clientset, namespace, deploymentName string) {
	options := metav1.ListOptions{
		// remove this line it will become universal for all the deployment
		// it will listen for all deployment inside namespace
		FieldSelector: fmt.Sprintf("metadata.name=%s", deploymentName),
	}
	watcher, err := clientset.AppsV1().Deployments(namespace).Watch(context.Background(), options)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: Failed to watch deployment - "+err.Error()))
		return
	}

	defer watcher.Stop()

	// preserving the replicas and image for next call
	var lastReplicas *int32
	var lastImage string

	for event := range watcher.ResultChan() {
		deployment, ok := event.Object.(*v1.Deployment)
		if !ok {
			continue
		}

		var logs []DeploymentUpdate
		message := fmt.Sprintf("Deployment %s changed: %s", deployment.Name, event.Type)

		if lastReplicas == nil || *lastReplicas != *deployment.Spec.Replicas {
			message = fmt.Sprintf("Deployment %s updated - Replicas changed: %d", deployment.Name, *deployment.Spec.Replicas)
			lastReplicas = deployment.Spec.Replicas
			logs = append(logs, DeploymentUpdate{
				Timestamp: time.Now().Format(time.RFC3339),
				Message:   message,
			})
		}

		if len(deployment.Spec.Template.Spec.Containers) > 0 {
			currentImage := deployment.Spec.Template.Spec.Containers[0].Image
			if lastImage == "" || lastImage != currentImage {
				message = fmt.Sprintf("Deployment %s updated - Image changed: %s", deployment.Name, currentImage)
				logs = append(logs, DeploymentUpdate{
					Timestamp: time.Now().Format(time.RFC3339),
					Message:   message,
				})
				lastImage = currentImage
			}
		}

		for _, logLine := range logs {
			jsonMessage, _ := json.Marshal(logLine)
			if err := conn.WriteMessage(websocket.TextMessage, jsonMessage); err != nil {
				log.Println("Error writing to WebSocket:", err)
				return
			}
		}
	}
}

func getDeploymentLogs(deployment *v1.Deployment) []string {
	baseTime := time.Now().Format(time.RFC3339)

	replicas := int32(1)
	if deployment.Spec.Replicas != nil {
		replicas = *deployment.Spec.Replicas
	}

	logs := []string{
		fmt.Sprintf("[%s] INFO: Deployment workload %s initiated", baseTime, deployment.Name),
		fmt.Sprintf("[%s] INFO: Workload created with replicas: %d, image: %s", baseTime, replicas, deployment.Spec.Template.Spec.Containers[0].Image),
		fmt.Sprintf("[%s] INFO: Namespace %s successfully updated", baseTime, deployment.Namespace),
		fmt.Sprintf("[%s] INFO: Available Replicas: %d", baseTime, deployment.Status.AvailableReplicas),
	}

	if len(deployment.Status.Conditions) > 0 {
		cond := deployment.Status.Conditions[0]
		logs = append(logs,
			fmt.Sprintf("[%s] INFO: Condition: %s", baseTime, cond.Type),
			fmt.Sprintf("[%s] INFO: LastUpdateTime: %s", baseTime, cond.LastUpdateTime.Time),
			fmt.Sprintf("[%s] INFO: LastTransitionTime: %s", baseTime, cond.LastTransitionTime.Time),
			fmt.Sprintf("[%s] INFO: Message: %s", baseTime, cond.Message),
		)
	} else {
		logs = append(logs, fmt.Sprintf("[%s] WARNING: No conditions found for deployment", baseTime))
	}

	return logs
}
