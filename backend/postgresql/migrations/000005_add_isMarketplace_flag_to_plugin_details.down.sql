-- delete unique constraints created on previous migration
ALTER TABLE plugin_details
DROP CONSTRAINT plugin_details_author_id_name_version_is_marketplace_plugin_key;

-- add old unique constraints
ALTER TABLE plugin_details
ADD CONSTRAINT plugin_details_author_id_name_version_key
UNIQUE (author_id, name, version);

-- drop column
ALTER TABLE plugin_details
DROP COLUMN IF EXISTS isMarketplacePlugin;