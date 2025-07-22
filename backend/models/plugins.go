package models

import "time"

type PluginDetails struct {
	ID                    int            `json:"id"`
	Name                  string         `json:"name" binding:"required"`
	Version               string         `json:"version" binding:"required"`
	Description           string         `json:"description,omitempty"`
	AuthorName            string         `json:"author_name" binding:"required"`
	AuthorID              int            `json:"author_id" binding:"required"`
	Website               string         `json:"website,omitempty"`
	Repository            string         `json:"repository,omitempty"`
	License               string         `json:"license,omitempty"`
	Tags                  []string       `json:"tags,omitempty"`
	MinKubeStellarVersion string         `json:"min_kubestellar_version" binding:"required"`
	MaxKubeStellarVersion string         `json:"max_kubestellar_version" binding:"required"`
	Dependencies          []Dependencies `json:"dependencies,omitempty"`
	PluginS3Key           string         `json:"plugin_s3_key" binding:"required"`
	FileSize              int            `json:"file_size,omitempty"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
}

type Dependencies struct {
	Name     string `json:"name" binding:"required"`
	Version  string `json:"version" binding:"required"`
	Required bool   `json:"required" binding:"required"` // if true, the plugin will not work without this dependency
}

type PluginFeedback struct {
	ID                  int       `json:"id"`
	MarketplacePluginID int       `json:"marketplace_plugin_id" binding:"required"`
	UserID              int       `json:"user_id" binding:"required"`
	Rating              int       `json:"rating" binding:"required,min=1,max=5"`
	Comment             string    `json:"comment,omitempty"`
	Suggestions         string    `json:"suggestions,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
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

type MarketplacePlugin struct {
	ID              int       `json:"id"`
	PluginDetailsID int       `json:"plugin_details_id" binding:"required"`
	Featured        bool      `json:"featured"`
	Verified        bool      `json:"verified"`
	PriceType       string    `json:"price_type"`
	Price           float64   `json:"price"`
	Currency        string    `json:"currency"`
	RatingAverage   float32   `json:"rating_average"`
	RatingCount     int       `json:"rating_count"`
	Downloads       int       `json:"downloads"`
	ActiveInstalls  int       `json:"active_installs"`
	PublishedAt     time.Time `json:"published_at"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type InstalledPlugin struct {
	ID                  int       `json:"id"`
	PluginDetailsID     int       `json:"plugin_details_id" binding:"required"`
	MarketplacePluginID *int      `json:"marketplace_plugin_id,omitempty"`
	UserID              int       `json:"user_id" binding:"required"`
	InstalledMethod     string    `json:"installed_method" binding:"required"`
	Enabled             bool      `json:"enabled"`
	Status              string    `json:"status"`
	InstalledPath       string    `json:"installed_path" binding:"required"`
	LoadTime            int       `json:"loadtime"` // tracks the time taken to load the plugin in seconds
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type PluginReplyFeedback struct {
	ID            int       `json:"id"`
	FeedbackID    int       `json:"feedback_id" binding:"required"`
	ParentReplyID *int      `json:"parent_reply_id,omitempty"`
	UserID        int       `json:"user_id" binding:"required"`
	Comment       string    `json:"comment" binding:"required"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type PluginCategory struct {
	ID              int       `json:"id"`
	Name            string    `json:"name" binding:"required"`
	PluginDetailsID int       `json:"plugin_details_id" binding:"required"`
	Description     string    `json:"description,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PluginScreenShot struct {
	ID                  int       `json:"id"`
	MarketplacePluginID int       `json:"marketplace_plugin_id" binding:"required"`
	S3Key               string    `json:"s3_key" binding:"required"`
	S3URL               string    `json:"s3_url" binding:"required"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type PluginVersion struct {
	ID              int       `json:"id"`
	PluginDetailsID int       `json:"plugin_details_id" binding:"required"`
	Version         string    `json:"version" binding:"required"`
	Changelog       []string  `json:"changelog" binding:"required"`
	ReleaseDate     time.Time `json:"release_date" binding:"required"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type PluginPayment struct {
	ID                  int       `json:"id"`
	UserID              int       `json:"user_id" binding:"required"`
	MarketplacePluginID int       `json:"marketplace_plugin_id" binding:"required"`
	PaymentMethod       string    `json:"payment_method" binding:"required"`
	Amount              float64   `json:"amount" binding:"required"`
	Currency            string    `json:"currency" binding:"required"`
	Status              string    `json:"status"`
	TransactionID       string    `json:"transaction_id" binding:"required"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
