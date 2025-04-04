package routes

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/kubestellar/ui/wds"
	"github.com/kubestellar/ui/wds/deployment"
	"k8s.io/client-go/informers"
)

func setupDeploymentRoutes(router *gin.Engine) {
	router.GET("/api/wds/workloads", deployment.GetWDSWorkloads)
	router.GET("/api/wds/:name", deployment.GetDeploymentByName)
	router.GET("/api/wds/status", deployment.GetDeploymentStatus)

	// websocket
	router.GET("/ws", func(ctx *gin.Context) {
		deployment.HandleDeploymentLogs(ctx.Writer, ctx.Request)
	})
	router.GET("/api/wds/logs", func(ctx *gin.Context) {
		var upgrader = websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		}
		var w = ctx.Writer
		var r = ctx.Request
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Failed to upgrade connection:", err)
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Failed to upgrade to WebSocket"})
			return
		}
		//defer conn.Close()

		clientset, err := wds.GetClientSetKubeConfig()
		if err != nil {
			log.Println("Failed to get Kubernetes client:", err)
			conn.WriteMessage(websocket.TextMessage, []byte("Error getting Kubernetes client"))
			return
		}
		ch := make(chan struct{})
		factory := informers.NewSharedInformerFactory(clientset, 10*time.Minute)
		c := wds.NewController(clientset, factory.Apps().V1().Deployments(), conn)
		factory.Start(ch)
		go c.Run(ch)
	})

	// context
	router.GET("/api/context", func(c *gin.Context) {
		currentContext, context, err := wds.ListContexts()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"wds-context":     context,        // this only contains wds named context
			"current-context": currentContext, // current context can be anything
		})
	})

}
