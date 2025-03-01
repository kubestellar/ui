package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds/bp"
)

func setupBlueprintRoutes(router *gin.Engine) {
	router.GET("/api/bp", bp.GetAllBp)
	router.GET("/api/bp/status", bp.GetBpStatus)
	router.POST("/api/bp/create", bp.CreateBp)
	router.DELETE("/api/bp/delete/:name", bp.DeleteBp)
	router.DELETE("/api/bp/delete", bp.DeleteAllBp)
}
