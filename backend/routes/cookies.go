package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/kubestellar/ui/wds"
)

func setupWdsCookiesRoute(router *gin.Engine) {
	router.POST("/wds/set/context", wds.SetWdsContextCookies) // set wds context in cookie
	router.GET("/wds/get/context", wds.GetWdsContextCookies)  // get all context from wds, system-context, ui-cookies-saved context
}
