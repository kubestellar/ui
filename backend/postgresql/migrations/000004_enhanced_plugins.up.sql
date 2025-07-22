-- Create plugin_details table, shares common details required by installed_plugins and marketplace_plugins
CREATE TABLE IF NOT EXISTS plugin_details (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author_name VARCHAR(255) NOT NULL,
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    loadtime INTEGER NOT NULL DEFAULT 0,  -- tracks the time taken to load the plugin in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drop previous migration plugin_route table, it isn't useful anymore
-- As routes are only required when plugin is installed on system and we can get it from pluginmanifest struct during runtime
DROP TABLE IF EXISTS plugin_route;

-- Already implemented plugin_feedback but we need some constraints and columns to be changed
ALTER TABLE plugin_feedback RENAME COLUMN plugin_id TO marketplace_plugin_id;
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_plugin_id_fkey;
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_user_id_fkey;

-- Add foreign key constraint to plugin_feedback table
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_marketplace_plugin_id_fkey FOREIGN KEY (marketplace_plugin_id) REFERENCES marketplace_plugins(id) ON DELETE CASCADE;
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


-- We need a table to store reply to feedback
-- Create plugin_reply_feedback table, stores reply to feedback
CREATE TABLE IF NOT EXISTS plugin_reply_feedback (
    id SERIAL PRIMARY KEY,
    feedback_id INTEGER NOT NULL REFERENCES plugin_feedback(id) ON DELETE CASCADE,
    parent_reply_id INTEGER REFERENCES plugin_reply_feedback(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create plugin_categories table, stores categories for plugins
CREATE TABLE IF NOT EXISTS plugin_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plugin_details_id INTEGER NOT NULL REFERENCES plugin_details(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create plugin_screenshots table, stores screenshots for plugins required for marketplace
CREATE TABLE IF NOT EXISTS plugin_screenshots (
    id SERIAL PRIMARY KEY,
    marketplace_plugin_id INTEGER NOT NULL REFERENCES marketplace_plugins(id) ON DELETE CASCADE,
    s3_key VARCHAR(255) NOT NULL,
    s3_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create plugin_version table, stores versions history and changelog
CREATE TABLE IF NOT EXISTS plugin_version (
    id SERIAL PRIMARY KEY,
    plugin_details_id INTEGER NOT NULL REFERENCES plugin_details(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    changelog TEXT[] NOT NULL,
    release_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create plugin_payment table, stores payment details for plugins, can be used for future payments implementation
CREATE TABLE IF NOT EXISTS plugin_payment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    marketplace_plugin_id INTEGER NOT NULL REFERENCES marketplace_plugins(id),
    payment_method VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(255) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    transaction_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Create indexes for better performance

-- Plugin details indexes
CREATE INDEX IF NOT EXISTS idx_plugin_details_name ON plugin_details(name);
CREATE INDEX IF NOT EXISTS idx_plugin_details_author_id ON plugin_details(author_id);

-- Marketplace plugins indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_plugins_plugin_details_id ON marketplace_plugins(plugin_details_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_plugins_featured ON marketplace_plugins(featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_plugins_verified ON marketplace_plugins(verified);

-- Installed plugins indexes
CREATE INDEX IF NOT EXISTS idx_installed_plugins_plugin_details_id ON installed_plugins(plugin_details_id);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_marketplace_plugin_id ON installed_plugins(marketplace_plugin_id);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_user_id ON installed_plugins(user_id);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_status ON installed_plugins(status);
CREATE INDEX IF NOT EXISTS idx_installed_plugins_enabled ON installed_plugins(enabled);

-- Plugin feedback indexes
CREATE INDEX IF NOT EXISTS idx_plugin_feedback_marketplace_plugin_id ON plugin_feedback(marketplace_plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_feedback_user_id ON plugin_feedback(user_id);

-- Plugin reply feedback indexes
CREATE INDEX IF NOT EXISTS idx_plugin_reply_feedback_feedback_id ON plugin_reply_feedback(feedback_id);
CREATE INDEX IF NOT EXISTS idx_plugin_reply_feedback_user_id ON plugin_reply_feedback(user_id);

-- Plugin categories indexes
CREATE INDEX IF NOT EXISTS idx_plugin_categories_plugin_id ON plugin_categories(plugin_details_id);

-- Plugin screenshots indexes
CREATE INDEX IF NOT EXISTS idx_plugin_screenshots_marketplace_plugin_id ON plugin_screenshots(marketplace_plugin_id);

-- Plugin version indexes
CREATE INDEX IF NOT EXISTS idx_plugin_version_plugin_id ON plugin_version(plugin_details_id);

-- Plugin payment indexes
CREATE INDEX IF NOT EXISTS idx_plugin_payment_user_id ON plugin_payment(user_id);
CREATE INDEX IF NOT EXISTS idx_plugin_payment_marketplace_plugin_id ON plugin_payment(marketplace_plugin_id);