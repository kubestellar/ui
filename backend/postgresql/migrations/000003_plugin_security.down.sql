-- Drop security-related tables
DROP TABLE IF EXISTS plugin_security_warning;
DROP TABLE IF EXISTS plugin_security_issue;
DROP TABLE IF EXISTS plugin_security_scan;

-- Drop security-related columns from plugin table
ALTER TABLE plugin DROP COLUMN IF EXISTS security_score;
ALTER TABLE plugin DROP COLUMN IF EXISTS security_status;
ALTER TABLE plugin DROP COLUMN IF EXISTS galaxy_safe;
ALTER TABLE plugin DROP COLUMN IF EXISTS last_scanned;
ALTER TABLE plugin DROP COLUMN IF EXISTS security_checksum;
ALTER TABLE plugin DROP COLUMN IF EXISTS risk_level;

-- Drop security-related indexes
DROP INDEX IF EXISTS idx_plugins_security_status;
DROP INDEX IF EXISTS idx_plugins_galaxy_safe;
DROP INDEX IF EXISTS idx_plugins_risk_level; 