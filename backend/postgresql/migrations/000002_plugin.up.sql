CREATE TABLE IF NOT EXISTS plugin (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_system_config (
    id SERIAL PRIMARY KEY,
    plugins_directory TEXT NOT NULL,
    autoload_plugins BOOLEAN NOT NULL,
    plugin_timeout INTEGER,
    max_concurrent_calls INTEGER NOT NULL,
    log_level VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_route (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER NOT NULL REFERENCES plugin(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    handler TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
-- Plugin table indexes
CREATE INDEX idx_plugins_name ON plugin(name);
CREATE INDEX idx_plugins_user_id ON plugin(user_id);
CREATE INDEX idx_plugins_enabled ON plugin(enabled);

-- Plugin route indexes
CREATE INDEX idx_plugin_route_plugin_id ON plugin_route(plugin_id);

