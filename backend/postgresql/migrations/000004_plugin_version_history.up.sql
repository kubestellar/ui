CREATE TABLE IF NOT EXISTS plugin_version_history (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER NOT NULL REFERENCES plugin(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    changelog TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plugin_version_history_plugin_id ON plugin_version_history(plugin_id);