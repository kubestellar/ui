-- Create deleted_users_log table
CREATE TABLE IF NOT EXISTS deleted_users_log (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            is_admin BOOLEAN,
            deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );