package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/backend/wds/bp"
)

func setupBindingPolicyRoutes(router *gin.Engine, apiGroup *gin.RouterGroup) {
	apiGroup.GET("/bp", bp.GetAllBp)
	apiGroup.GET("/bp/status", bp.GetBpStatus)
	apiGroup.POST("/bp/create", bp.CreateBp)
	apiGroup.POST("/bp/create-json", bp.CreateBpFromJson)
	apiGroup.POST("/bp/quick-connect", bp.CreateQuickBindingPolicy)
	apiGroup.POST("/bp/generate-yaml", bp.GenerateQuickBindingPolicyYAML)
	apiGroup.DELETE("/bp/delete/:name", bp.DeleteBp)
	apiGroup.DELETE("/bp/delete", bp.DeleteAllBp)
	apiGroup.PATCH("/bp/update/:name", bp.UpdateBp)
}
