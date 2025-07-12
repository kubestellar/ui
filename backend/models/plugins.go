package models

import "time"

type Plugin struct {
	ID          int       `json:"id"`
	Name        string    `json:"name" binding:"required"`
	Version     string    `json:"version" binding:"required"`
	Enabled     bool      `json:"enabled" binding:"required"`
	Description string    `json:"description,omitempty"`
	UserID      int       `json:"user_id" binding:"required"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	// Security fields
	SecurityScore    int       `json:"security_score,omitempty"`
	SecurityStatus   string    `json:"security_status,omitempty"` // "safe", "unsafe", "pending", "failed"
	GalaxySafe       bool      `json:"galaxy_safe,omitempty"`
	LastScanned      time.Time `json:"last_scanned,omitempty"`
	SecurityChecksum string    `json:"security_checksum,omitempty"`
	RiskLevel        string    `json:"risk_level,omitempty"` // "low", "medium", "high", "critical"
}

type PluginFeedback struct {
	ID          int       `json:"id"`
	PluginID    int       `json:"plugin_id" binding:"required"`
	UserID      int       `json:"user_id" binding:"required"`
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
	PluginID  int       `json:"plugin_id" binding:"required"`
	Path      string    `json:"path" binding:"required"`
	Method    string    `json:"method" binding:"required"`
	Handler   string    `json:"handler" binding:"required"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SecurityScanResult represents the result of a security scan
type SecurityScanResult struct {
	Safe           bool                    `json:"safe"`
	Score          int                     `json:"score"`
	Issues         []SecurityIssue         `json:"issues,omitempty"`
	Warnings       []SecurityWarning       `json:"warnings,omitempty"`
	Checksum       string                  `json:"checksum"`
	ScanTime       time.Time               `json:"scanTime"`
	ScanDuration   time.Duration           `json:"scanDuration"`
	FileAnalysis   map[string]FileAnalysis `json:"fileAnalysis,omitempty"`
	OverallRisk    string                  `json:"overallRisk"`
	Recommendation string                  `json:"recommendation"`
	GalaxySafe     bool                    `json:"galaxySafe"`
}

// SecurityIssue represents a security issue found during scanning
type SecurityIssue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"`
	Description string `json:"description"`
	File        string `json:"file,omitempty"`
	Line        int    `json:"line,omitempty"`
	Code        string `json:"code,omitempty"`
}

// SecurityWarning represents a security warning found during scanning
type SecurityWarning struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	File        string `json:"file,omitempty"`
	Line        int    `json:"line,omitempty"`
	Code        string `json:"code,omitempty"`
}

// FileAnalysis contains analysis results for a specific file
type FileAnalysis struct {
	FileType    string   `json:"fileType"`
	Size        int64    `json:"size"`
	Checksum    string   `json:"checksum"`
	Issues      []string `json:"issues,omitempty"`
	Warnings    []string `json:"warnings,omitempty"`
	Permissions string   `json:"permissions,omitempty"`
}
