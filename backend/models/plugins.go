package models

import "time"

type Plugin struct {
	ID          int       `json:"id"`
	Name        string    `json:"name" binding:"required"`
	Version     string    `json:"version" binding:"required"`
	Enabled     bool      `json:"enabled" binding:"required"`
	Description string    `json:"description,omitempty"`
	UserId      int       `json:"user_id" binding:"required"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PluginFeedback struct {
	ID          int       `json:"id"`
	PluginId    int       `json:"plugin_id" binding:"required"`
	UserId      int       `json:"user_id" binding:"required"`
	Rating      int       `json:"rating" binding:"required,min=1,max=5"`
	Comment     string    `json:"comment,omitempty"`
	Suggestions string    `json:"suggestions,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PluginSystemConfig struct {
	ID                 int    `json:"id"`
	PluginsDirectory   string `json:"plugins_directory" binding:"required"`
	AutoloadPlugins    bool   `json:"autoload_plugins" binding:"required"`
	PluginTimeout      int    `json:"plugin_timeout"`
	MaxConcurrentCalls int    `json:"max_concurrent_calls" binding:"required"`
	LogLevel           string `json:"log_level" binding:"required"`
}

type PluginRoute struct {
	ID        int       `json:"id"`
	PluginId  int       `json:"plugin_id" binding:"required"`
	Path      string    `json:"path" binding:"required"`
	Method    string    `json:"method" binding:"required"`
	Handler   string    `json:"handler" binding:"required"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
