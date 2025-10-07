package wecs_test

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/wecs"
	"github.com/stretchr/testify/assert"
)

type mockWebSocket struct {
	writeCount int
	lastMsg    []byte
	failWrite  bool
}

func (m *mockWebSocket) WriteMessage(mt int, msg []byte) error {
	m.writeCount++
	m.lastMsg = msg
	if m.failWrite {
		return errors.New("write error")
	}
	return nil
}

func TestSessionMap_Basic(t *testing.T) {
	sm := &wecs.SessionMap{Sessions: make(map[string]wecs.TerminalSession)}
	// Can't construct TerminalSession directly (unexported fields), so test map logic only
	sm.Sessions["abc"] = wecs.TerminalSession{}
	_ = sm.Get("abc")
	sm.Close("abc")
	_, ok := sm.Sessions["abc"]
	assert.False(t, ok)
}

func TestSessionMap_Concurrent(t *testing.T) {
	sm := &wecs.SessionMap{Sessions: make(map[string]wecs.TerminalSession)}
	wg := sync.WaitGroup{}
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a' + i))
			sm.Set(key, wecs.TerminalSession{})
		}(i)
	}
	wg.Wait()
	for i := 0; i < 10; i++ {
		_ = sm.Get(string(rune('a' + i)))
	}
}

func TestGenTerminalSessionId(t *testing.T) {
	id1, err1 := wecs.GenTerminalSessionId()
	id2, err2 := wecs.GenTerminalSessionId()
	assert.NoError(t, err1)
	assert.NoError(t, err2)
	assert.NotEqual(t, id1, id2)
	assert.Len(t, id1, 32)
}

func TestIsValidShellCmd(t *testing.T) {
	validShells := []string{"bash", "sh", "cmd"}
	assert.True(t, wecs.IsValidShellCmd(validShells, "bash"))
	assert.False(t, wecs.IsValidShellCmd(validShells, "powershell"))
}

// TestConnWriter_Write is commented out because ConnWriter expects a *websocket.Conn, which cannot be easily mocked without a real network connection.
/*
func TestConnWriter_Write(t *testing.T) {
	mockWS := &mockWebSocket{}
	cw := wecs.ConnWriter{Conn: mockWS}
	n, err := cw.Write([]byte("hello"))
	assert.NoError(t, err)
	assert.Equal(t, 5, n)
	assert.Contains(t, string(mockWS.lastMsg), "hello")
	mockWS.failWrite = true
	_, err2 := cw.Write([]byte("fail"))
	assert.Error(t, err2)
}
*/

func TestGetAllPodContainersName_BadRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/", nil)
	wecs.GetAllPodContainersName(c)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "no context present as query")
}

// More tests for GetAllPodContainersName with k8s client mocking would go here.
