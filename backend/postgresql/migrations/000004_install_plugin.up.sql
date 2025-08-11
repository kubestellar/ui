CREATE TABLE IF NOT EXISTS plugin_details (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author_id INTEGER NOT NULL REFERENCES users(id),
    website VARCHAR(255),
    repository VARCHAR(255),
    license VARCHAR(100),
    tags TEXT[],
    min_kubestellar_version VARCHAR(50) NOT NULL,
    max_kubestellar_version VARCHAR(50) NOT NULL,
    dependencies JSONB NOT NULL,
    plugin_s3_key VARCHAR(255) NOT NULL,  -- S3 key for storing plugin .tar.gz file
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(author_id,name, version)
);

-- Create marketplace_plugins table, stores plugins available in the marketplace
CREATE TABLE IF NOT EXISTS marketplace_plugins (
    id SERIAL PRIMARY KEY,
    plugin_details_id INTEGER NOT NULL REFERENCES plugin_details(id) ON DELETE CASCADE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    price_type VARCHAR(255) NOT NULL DEFAULT 'free' CHECK (price_type IN ('free', 'paid', 'subscription')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    rating_average FLOAT NOT NULL DEFAULT 0.00,
    rating_count INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    active_installs INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- We have already implemented this table using plugin table in previous migration
-- Now we no longer use plugin table for installed plugins, so we need to drop it and use installed_plugins
DROP TABLE IF EXISTS plugin CASCADE;

-- Create installed_plugins table, stores plugins installed by users
CREATE TABLE IF NOT EXISTS installed_plugins (
    id SERIAL PRIMARY KEY,
    plugin_details_id INTEGER NOT NULL REFERENCES plugin_details(id) ON DELETE CASCADE,
    marketplace_plugin_id INTEGER REFERENCES marketplace_plugins(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    installed_method VARCHAR(255) NOT NULL CHECK (installed_method IN ('manual', 'github', 'marketplace')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(255) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'loading', 'error', 'installed')),
    installed_path VARCHAR(255) NOT NULL,
    loadtime INTEGER NOT NULL DEFAULT 0,  -- tracks the time taken to load the plugin in milliseconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plugin_details_id, user_id)
);

DROP TABLE IF EXISTS plugin_route;

-- Already implemented plugin_feedback but we need some constraints and columns to be changed
ALTER TABLE plugin_feedback RENAME COLUMN plugin_id TO marketplace_plugin_id;
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_plugin_id_fkey;
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_user_id_fkey;

-- Add foreign key constraint to plugin_feedback table
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_marketplace_plugin_id_fkey FOREIGN KEY (marketplace_plugin_id) REFERENCES marketplace_plugins(id) ON DELETE CASCADE;
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
