package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/api"
)

func setupChatbotRoutes(router *gin.Engine) {
	router.GET("/api/chatbot", api.ChatbotHandler)
}