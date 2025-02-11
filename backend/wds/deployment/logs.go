package deployment

import (
	"context"
	"fmt"
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

func HandleDeploymentLogs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()
	namespace := r.URL.Query().Get("namespace")
	deploymentName := r.URL.Query().Get("deployment")

	clientset, err := wds.GetClientSetKubeConfig()
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
		return
	}
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.Background(), deploymentName, metav1.GetOptions{})
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
		return
	}

	logs := getDeploymentLogs(deployment)
	for _, logLine := range logs {
		conn.WriteMessage(websocket.TextMessage, []byte(logLine))
		time.Sleep(time.Second)
	}

}

func StartOfMonth(date time.Time) time.Time {
	return time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location())
}

func getDeploymentLogs(deployment *v1.Deployment) []string {
	baseTime := StartOfMonth(time.Now())
	logs := []string{
		fmt.Sprintf("[%v] INFO: Deployment workload %v initiated ", baseTime, deployment.Name),
		fmt.Sprintf("[%v] INFO: Workload created with replicas: %v, image: %v ", baseTime, deployment.Spec.Replicas, deployment.Spec.Template.Spec.Containers[0].Image),
		fmt.Sprintf("[%v] INFO: Namespace %v successfully updated  ", baseTime, deployment.Namespace),
		fmt.Sprintf("[%v] INFO: Namespace %v successfully updated  ", baseTime, deployment.Namespace),
		fmt.Sprintf("[%v] INFO: Replicas: %s ", baseTime, string(deployment.Status.Replicas)),
		fmt.Sprintf("[%v] INFO: Available Replicas: %s ", baseTime, string(deployment.Status.AvailableReplicas)),
		fmt.Sprintf("[%v] INFO: Conditions: %s ", baseTime, deployment.Status.Conditions[0].Type),
		fmt.Sprintf("[%v] INFO: LastUpdateTime : %s ", baseTime, deployment.Status.Conditions[0].LastUpdateTime.Time),
		fmt.Sprintf("[%v] INFO: LastTransitionTime : %s ", baseTime, deployment.Status.Conditions[0].LastTransitionTime.Time),
		fmt.Sprintf("[%v] INFO: Conditions: %s ", baseTime, deployment.Status.Conditions[0].Type),
		fmt.Sprintf("[%v] INFO: Message: %s ", baseTime, deployment.Status.Conditions[0].Message),
	}

	return logs
}
