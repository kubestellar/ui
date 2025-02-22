package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds/bp"
)

func setupBlueprintRoutes(router *gin.Engine) {
	router.POST("/api/bp/create", bp.CreateBp)
	router.DELETE("/api/bp/delete/:name", bp.DeleteBp)
	router.DELETE("/api/bp/delete", bp.DeleteAllBp)
}
