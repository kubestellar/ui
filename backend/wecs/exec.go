package wecs

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/backend/k8s"
	"github.com/kubestellar/ui/backend/log"
	"go.uber.org/zap"
	authorizationv1 "k8s.io/api/authorization/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
)

// TODO: Add the logical error message so that user can know whats the exact problem
// TODO: Message for the user have View Only Access
// "You do not have permission to execute into this pod. Please check your access rights."

// Todo: Test with the user having not access to do pod/exec
// Todo: Websocket improvement and remove the error message like "Connection closed"

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
	log.LogDebug("Getting terminal session", zap.String("sessionId", sessionId))
	return sm.Sessions[sessionId]
}

func (sm *SessionMap) Set(sessionId string, session TerminalSession) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()
	log.LogDebug("Setting terminal session", zap.String("sessionId", sessionId))
	sm.Sessions[sessionId] = session
}

func (sm *SessionMap) Close(sessionId string) {
	sm.Lock.Lock()
	defer sm.Lock.Unlock()
	if session, ok := sm.Sessions[sessionId]; ok {
		if session.socket != nil {
			session.socket.Close()
		}
		delete(sm.Sessions, sessionId)
		log.LogInfo("Closed terminal session", zap.String("sessionId", sessionId))
	}
}

var terminalSessions = SessionMap{Sessions: make(map[string]TerminalSession)}

func GenTerminalSessionId() (string, error) {
	log.LogInfo("Generating terminal session ID")
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		log.LogError("Failed to generate session ID", zap.Error(err))
		return "", err
	}
	id := make([]byte, hex.EncodedLen(len(bytes)))
	hex.Encode(id, bytes)
	log.LogDebug("Generated session ID", zap.String("sessionId", string(id)))
	return string(id), nil
}

// Change isValidShellCmd to IsValidShellCmd
func IsValidShellCmd(validShells []string, shell string) bool {
	log.LogInfo("Validating shell command", zap.String("shell", shell))
	for _, validShell := range validShells {
		if validShell == shell {
			log.LogDebug("Shell command is valid", zap.String("shell", shell))
			return true
		}
	}
	log.LogDebug("Shell command is invalid", zap.String("shell", shell))
	return false
}

func GetAllPodContainersName(c *gin.Context) {
	log.LogInfo("Getting all pod containers")
	context := c.Query("context")
	if context == "" {
		log.LogError("No context provided in query")
		c.JSON(http.StatusBadRequest, gin.H{"error": "no context present as query"})
		return
	}
	clientSet, _, err := k8s.GetClientSetWithContext(context)
	if err != nil {
		log.LogError("Failed to get kube context", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get kube context"})
		return
	}
	namespace := c.Param("namespace")
	if namespace == "" {
		log.LogError("No namespace provided")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get the namespace"})
		return
	}
	podName := c.Param("pod")
	pod, err := clientSet.CoreV1().Pods(namespace).Get(c, podName, metav1.GetOptions{})
	if err != nil {
		log.LogError("Failed to get pod",
			zap.String("namespace", namespace),
			zap.String("pod", podName),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get the pods"})
		return
	}
	type ContainerInfo struct {
		Image         string
		ContainerName string
	}
	var containerList []ContainerInfo
	for _, container := range pod.Spec.Containers {
		log.LogDebug("Found container",
			zap.String("name", container.Name),
			zap.String("image", container.Image))
		containerList = append(containerList, ContainerInfo{
			Image:         container.Image,
			ContainerName: container.Name,
		})
	}
	log.LogInfo("Successfully retrieved pod containers",
		zap.String("namespace", namespace),
		zap.String("pod", podName),
		zap.Int("containerCount", len(containerList)))
	c.JSON(http.StatusOK, gin.H{
		"data": containerList,
	})
}

func startShellProcess(c *gin.Context, clientSet *kubernetes.Clientset, cfg *rest.Config, cmd []string, conn *websocket.Conn, namespace string) error {
	log.LogInfo("Starting shell process",
		zap.String("namespace", namespace),
		zap.Strings("command", cmd))

	podName := c.Param("pod")
	containerName := c.Param("container")
	req := clientSet.CoreV1().RESTClient().Post().Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec")

	req.VersionedParams(&v1.PodExecOptions{
		Container: containerName,
		Command:   cmd,
		Stdin:     true,
		Stdout:    true,
		Stderr:    true,
		TTY:       true,
	}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(cfg, "POST", req.URL())
	if err != nil {
		log.LogError("Failed to create SPDY executor", zap.Error(err))
		return err
	}

	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		for {
			_, message, err := conn.ReadMessage()
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.LogWarn("Unexpected WebSocket closure", zap.Error(err))
			} else {
				log.LogDebug("WebSocket closed gracefully")
			}
			if err != nil {
				if websocket.IsUnexpectedCloseError(err) {
					log.LogError("WebSocket unexpectedly closed", zap.Error(err))
				} else {
					log.LogInfo("WebSocket closed", zap.Error(err))
				}
				return
			}
			var msg TerminalMessage
			if err := json.Unmarshal(message, &msg); err == nil && msg.Op == "stdin" {
				writer.Write([]byte(msg.Data))
			}
		}
	}()

	log.LogDebug("Starting terminal stream",
		zap.String("pod", podName),
		zap.String("container", containerName))

	err = exec.Stream(remotecommand.StreamOptions{
		Stdin:  reader,
		Stdout: connWriter{conn},
		Stderr: connWriter{conn},
		Tty:    true,
	})

	if err != nil {
		log.LogError("Failed to stream terminal", zap.Error(err))
		return err
	}

	log.LogInfo("Shell process started successfully",
		zap.String("namespace", namespace),
		zap.Strings("command", cmd))
	return nil
}

type connWriter struct {
	conn *websocket.Conn
}

func (cw connWriter) Write(p []byte) (int, error) {
	log.LogDebug("Writing to websocket connection", zap.Int("bytes", len(p)))
	msg, _ := json.Marshal(TerminalMessage{Op: "stdout", Data: string(p)})
	err := cw.conn.WriteMessage(websocket.TextMessage, msg)
	if err != nil {
		log.LogError("Failed to write to websocket", zap.Error(err))
		return 0, err
	}
	return len(p), nil
}

func HandlePodExecShell(c *gin.Context) {
	log.LogInfo("Handling pod exec shell request",
		zap.String("namespace", c.Param("namespace")),
		zap.String("pod", c.Param("pod")),
		zap.String("container", c.Param("container")))

	sessionID, err := GenTerminalSessionId()
	if err != nil {
		log.LogError("Failed to generate session ID", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate session ID"})
		return
	}

	context := c.Query("context")
	if context == "" {
		log.LogError("No context provided in query")
		c.JSON(http.StatusBadRequest, gin.H{"error": "no context present as query"})
		return
	}
	clientset, restConfig, err := k8s.GetClientSetWithConfigContext(context)
	if err != nil {
		log.LogError("Failed to get kube context", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get kube context"})
		return
	}
	conn, err := upgrader1.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.LogError("Failed to upgrade to websocket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade to websocket"})
		return
	}
	defer conn.Close()
	namespace := c.Param("namespace")
	if namespace == "" {
		log.LogError("No namespace provided")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get the namespace"})
		return
	}
	ssar := &authorizationv1.SelfSubjectAccessReview{
		Spec: authorizationv1.SelfSubjectAccessReviewSpec{
			ResourceAttributes: &authorizationv1.ResourceAttributes{
				Namespace: namespace,
				Verb:      "create",
				Resource:  "pods/exec",
			},
		},
	}
	if !CanI(clientset, ssar) {
		log.LogError("User does not have permission to exec into pod",
			zap.String("namespace", namespace))
		conn.WriteMessage(websocket.TextMessage, []byte("Error: You do not have permission to execute into this pod. Please check your access rights."))
		return
	}

	shell := c.Query("shell")
	validShells := []string{"bash", "sh", "powershell", "cmd"}
	cmd := []string{shell}
	if !IsValidShellCmd(validShells, shell) {
		log.LogInfo("Invalid shell specified, defaulting to sh", zap.String("shell", shell))
		cmd = []string{"sh"}
	}

	err = startShellProcess(c, clientset, restConfig, cmd, conn, namespace)
	if err != nil {
		log.LogError("Terminal session error", zap.Error(err))
		conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
	} else {
		log.LogInfo("Terminal session ended successfully")
		conn.WriteMessage(websocket.TextMessage, []byte("Terminal session ended."))
	}
	terminalSessions.Close(sessionID)
}

func CanI(clientset *kubernetes.Clientset, ssar *authorizationv1.SelfSubjectAccessReview) bool {
	log.LogInfo("Checking user permissions",
		zap.String("namespace", ssar.Spec.ResourceAttributes.Namespace),
		zap.String("verb", ssar.Spec.ResourceAttributes.Verb),
		zap.String("resource", ssar.Spec.ResourceAttributes.Resource))

	response, err := clientset.AuthorizationV1().SelfSubjectAccessReviews().Create(context.TODO(), ssar, metav1.CreateOptions{})
	if err != nil {
		log.LogError("Failed to check permissions", zap.Error(err))
		return false
	}

	log.LogInfo("Permission check result",
		zap.Bool("allowed", response.Status.Allowed),
		zap.String("reason", response.Status.Reason))
	return response.Status.Allowed
}
