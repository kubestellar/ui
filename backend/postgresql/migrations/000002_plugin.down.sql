DROP INDEX IF EXISTS idx_plugin_route_plugin_id;
DROP INDEX IF EXISTS idx_plugins_enabled;
DROP INDEX IF EXISTS idx_plugins_user_id;
DROP INDEX IF EXISTS idx_plugins_name;

DROP TABLE IF EXISTS plugin_route;
DROP TABLE IF EXISTS plugin_system_config;
DROP TABLE IF EXISTS plugin;