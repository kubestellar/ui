-- Revert column rename and foreign keys in plugin_feedback
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_marketplace_plugin_id_fkey;
ALTER TABLE plugin_feedback DROP CONSTRAINT IF EXISTS plugin_feedback_user_id_fkey;
ALTER TABLE plugin_feedback RENAME COLUMN marketplace_plugin_id TO plugin_id;


-- Recreate droped table in up migration
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

CREATE TABLE IF NOT EXISTS plugin_route (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER NOT NULL REFERENCES plugin(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    handler TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recreate foreign keys in plugin_feedback
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES plugin(id) ON DELETE CASCADE;
ALTER TABLE plugin_feedback ADD CONSTRAINT plugin_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;


DROP TABLE IF EXISTS installed_plugins CASCADE;
DROP TABLE IF EXISTS marketplace_plugins CASCADE;
DROP TABLE IF EXISTS plugin_details CASCADE;