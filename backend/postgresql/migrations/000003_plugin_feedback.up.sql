CREATE TABLE IF NOT EXISTS plugin_feedback (
    id bigserial PRIMARY KEY,
    plugin_id int NOT NULL,
    user_id int NOT NULL,
    rating int NOT NULL,
    comment TEXT,
    suggestions TEXT,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),

    FOREIGN KEY (plugin_id) REFERENCES plugin (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);