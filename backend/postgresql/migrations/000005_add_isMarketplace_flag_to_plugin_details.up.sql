-- add new table isMarketplacePlugin
ALTER TABLE plugin_details
ADD COLUMN isMarketplacePlugin BOOLEAN NOT NULL DEFAULT FALSE;

-- drop old unique constraint
ALTER TABLE plugin_details
DROP CONSTRAINT plugin_details_author_id_name_version_key;

-- add new unique conatraints
ALTER TABLE plugin_details
ADD CONSTRAINT plugin_details_author_id_name_version_is_marketplace_plugin_key
UNIQUE (author_id, name, version, isMarketplacePlugin);