package wecs

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/k8s"
	"io"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/remotecommand"
	"net/http"
	"sync"
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

func startShellProcess(c *gin.Context, clientSet *kubernetes.Clientset, cfg *rest.Config, cmd []string, conn *websocket.Conn) error {
	namespace := c.Param("namespace")
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
		return err
	}

	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
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
	return len(p), cw.conn.WriteMessage(websocket.TextMessage, msg)
}

func HandlePodExecShell(c *gin.Context) {
	sessionID, err := genTerminalSessionId()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate session ID"})
		return
	}

	context := c.Query("context")
	if context == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no context present as query"})
		return
	}
	clientset, restConfig, err := k8s.GetClientSetWithConfigContext(context)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get kube context"})
		return
	}

	conn, err := upgrader1.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upgrade to websocket"})
		return
	}

	shell := c.Query("shell")
	validShells := []string{"bash", "sh", "powershell", "cmd"}
	cmd := []string{shell}
	if !isValidShellCmd(validShells, shell) {
		cmd = []string{"sh"}
	}

	err = startShellProcess(c, clientset, restConfig, cmd, conn)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
	}
	terminalSessions.Close(sessionID)
}
