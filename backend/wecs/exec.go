package wecs

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/k8s"
	authorizationv1 "k8s.io/api/authorization/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/klog/v2"
)

var upgrader1 = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type TerminalSession struct {
	id     string
	bound  chan error
	socket *websocket.Conn
}

type TerminalMessage struct {
	Op, Data, SessionID string
}

type SessionMap struct {
	Sessions map[string]TerminalSession
	Lock     sync.RWMutex
}

func (sm *SessionMap) Get(sessionId string) TerminalSession {
	sm.Lock.RLock()
	defer sm.Lock.RUnlock()
	return sm.Sessions[sessionId]
}

func (sm *SessionMap) Set(sessionId string, session TerminalSession) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()
	sm.Sessions[sessionId] = session
}

func (sm *SessionMap) Close(sessionId string) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()
	if session, ok := sm.Sessions[sessionId]; ok {
		session.socket.Close()
		delete(sm.Sessions, sessionId)
	}
}

var terminalSessions = SessionMap{Sessions: make(map[string]TerminalSession)}

func genTerminalSessionId() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	id := make([]byte, hex.EncodedLen(len(bytes)))
	hex.Encode(id, bytes)
	return string(id), nil
}

func isValidShellCmd(validShells []string, shell string) bool {
	for _, validShell := range validShells {
		if validShell == shell {
			return true
		}
	}
	return false
}

// canI checks whether the current user can perform verb on resource in namespace.
func canI(clientset *kubernetes.Clientset, namespace, verb, resource string) bool {
	ssar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Namespace: namespace,
				Verb:      verb,
				Resource:  resource,
			},
		},
	}
	resp, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().
		Create(context.TODO(), ssar, metav1.CreateOptions{})
	if err != nil {
		klog.ErrorS(err, "SelfSubjectAccessReview failed", "verb", verb, "resource", resource)
		return false
	}
	return resp.Status.Allowed
}

// GetAllPodContainersName returns the list of containers in a given pod.
func GetAllPodContainersName(c *gin.Context) {
	contextName := c.Query("context")
	if contextName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no context present as query"})
		return
	}
	clientSet, _, err := k8s.GetClientSetWithContext(contextName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get kube context"})
		return
	}
	namespace := c.Param("namespace")
	if namespace == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get the namespace"})
		return
	}
	podName := c.Param("pod")
	pod, err := clientSet.CoreV1().Pods(namespace).Get(c, podName, metav1.GetOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get the pod"})
		return
	}
	type ContainerInfo struct {
		Image         string
		ContainerName string
	}
	var containerList []ContainerInfo
	for _, container := range pod.Spec.Containers {
		containerList = append(containerList, ContainerInfo{
			Image:         container.Image,
			ContainerName: container.Name,
		})
	}
	c.JSON(http.StatusOK, gin.H{"data": containerList})
}

// startShellProcess attaches stdin/stdout/stderr of a shell to the websocket.
func startShellProcess(c *gin.Context, clientSet *kubernetes.Clientset, cfg *rest.Config, cmd []string, conn *websocket.Conn, namespace string) error {
	podName := c.Param("pod")
	containerName := c.Param("container")
	req := clientSet.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		VersionedParams(&v1.PodExecOptions{
			Container: containerName,
			Command:   cmd,
			Stdin:     true,
			Stdout:    true,
			Stderr:    true,
			TTY:       true,
		}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(cfg, "POST", req.URL())
	if err != nil {
		return err
	}

	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				// normal closes are ignored
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					klog.Warningf("Unexpected WebSocket closure: %v", err)
				}
				return
			}
			var msg TerminalMessage
			if err := json.Unmarshal(message, &msg); err == nil && msg.Op == "stdin" {
				writer.Write([]byte(msg.Data))
			}
		}
	}()

	return exec.Stream(remotecommand.StreamOptions{
		Stdin:  reader,
		Stdout: connWriter{conn},
		Stderr: connWriter{conn},
		Tty:    true,
	})
}

type connWriter struct {
	conn *websocket.Conn
}

func (cw connWriter) Write(p []byte) (int, error) {
	msg, _ := json.Marshal(TerminalMessage{Op: "stdout", Data: string(p)})
	_ = cw.conn.WriteMessage(websocket.TextMessage, msg)
	return len(p), nil
}

// HandlePodExecShell upgrades to a websocket and either execs a shell or falls back to logs.
func HandlePodExecShell(c *gin.Context) {
	sessionID, err := genTerminalSessionId()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate session ID"})
		return
	}

	contextName := c.Query("context")
	if contextName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no context present as query"})
		return
	}
	clientset, restConfig, err := k8s.GetClientSetWithConfigContext(contextName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get kube context"})
		return
	}

	conn, err := upgrader1.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade to websocket"})
		return
	}
	defer func() {
		conn.Close()
		terminalSessions.Close(sessionID)
	}()

	namespace := c.Param("namespace")
	if namespace == "" {
		conn.WriteJSON(TerminalMessage{Op: "error", Data: "no namespace specified"})
		return
	}
	pod := c.Param("pod")
	if pod == "" {
		conn.WriteJSON(TerminalMessage{Op: "error", Data: "no pod specified"})
		return
	}

	// 1) Exec access?
	if canI(clientset, namespace, "create", "pods/exec") {
		// determine shell
		shell := c.Query("shell")
		validShells := []string{"bash", "sh", "powershell", "cmd"}
		cmd := []string{shell}
		if !isValidShellCmd(validShells, shell) {
			cmd = []string{"sh"}
		}

		conn.WriteJSON(TerminalMessage{Op: "info", Data: "Starting interactive shell..."})
		if err := startShellProcess(c, clientset, restConfig, cmd, conn, namespace); err != nil {
			conn.WriteJSON(TerminalMessage{Op: "error", Data: fmt.Sprintf("Exec failed: %v", err)})
			klog.Errorf("Terminal exec error: %v", err)
		} else {
			conn.WriteJSON(TerminalMessage{Op: "info", Data: "Shell session ended."})
		}
		return
	}

	// 2) Logs-only access?
	if canI(clientset, namespace, "get", "pods/log") {
		conn.WriteJSON(TerminalMessage{
			Op:   "info",
			Data: "You have view-only access. Streaming live logs (ctrl-c to exit)…",
		})
		req := clientset.CoreV1().
			Pods(namespace).
			GetLogs(pod, &v1.PodLogOptions{Follow: true})
		stream, err := req.Stream(context.Background())
		if err != nil {
			conn.WriteJSON(TerminalMessage{Op: "error", Data: fmt.Sprintf("Could not stream logs: %v", err)})
			return
		}
		defer stream.Close()

		buf := make([]byte, 1024)
		for {
			n, err := stream.Read(buf)
			if n > 0 {
				conn.WriteJSON(TerminalMessage{Op: "stdout", Data: string(buf[:n])})
			}
			if err != nil {
				if err == io.EOF {
					break
				}
				conn.WriteJSON(TerminalMessage{Op: "error", Data: fmt.Sprintf("Log stream error: %v", err)})
				break
			}
		}
		conn.WriteJSON(TerminalMessage{Op: "info", Data: "Log stream ended."})
		return
	}

	// 3) No permission
	conn.WriteJSON(TerminalMessage{
		Op:   "error",
		Data: "You do not have permission to exec into or view logs of this pod. Please check your access rights.",
	})
}
