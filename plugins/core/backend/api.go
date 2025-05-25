package backend

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes sets up plugin routes on the given Gin engine
func RegisterRoutes(r *gin.Engine, mgr *Manager) {
	grp := r.Group("/plugins")
	{
		grp.POST("/install", installHandler(mgr))
		grp.DELETE("/:name", removeHandler(mgr))
		grp.GET("/", listHandler(mgr))
		grp.PUT("/:name/enable", enableHandler(mgr))
	}
}

func installHandler(m *Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Path string `json:"path" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := m.Install(req.Path); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusCreated)
	}
}

func removeHandler(m *Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		if err := m.Remove(name); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}

func listHandler(m *Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		plugins, _ := m.List()
		c.JSON(http.StatusOK, plugins)
	}
}

func enableHandler(m *Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		name := c.Param("name")
		var req struct {
			Enable bool `json:"enable"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := m.Enable(name, req.Enable); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusOK)
	}
}
