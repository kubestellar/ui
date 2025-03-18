package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/katamyra/kubestellarUI/wds/bp"
)

func setupBindingPolicyRoutes(router *gin.Engine) {
	router.GET("/api/bp", bp.GetAllBp)
	router.GET("/api/bp/status", bp.GetBpStatus)
	router.POST("/api/bp/create", bp.CreateBp)
	router.POST("/api/bp/create-json", bp.CreateBpFromJson)
	router.POST("/api/bp/quick-connect", bp.CreateQuickBindingPolicy)
	router.POST("/api/bp/generate-yaml", bp.GenerateQuickBindingPolicyYAML)
	router.DELETE("/api/bp/delete/:name", bp.DeleteBp)
	router.DELETE("/api/bp/delete", bp.DeleteAllBp)
	router.PATCH("/api/bp/update/:name", bp.UpdateBp)
}
