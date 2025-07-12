-- Add security-related columns to plugin table
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS security_score INTEGER DEFAULT 0;
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS security_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS galaxy_safe BOOLEAN DEFAULT FALSE;
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS last_scanned TIMESTAMP WITH TIME ZONE;
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS security_checksum VARCHAR(64);
ALTER TABLE plugin ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'unknown';

-- Create index for security status for faster queries
CREATE INDEX IF NOT EXISTS idx_plugins_security_status ON plugin(security_status);
CREATE INDEX IF NOT EXISTS idx_plugins_galaxy_safe ON plugin(galaxy_safe);
CREATE INDEX IF NOT EXISTS idx_plugins_risk_level ON plugin(risk_level);

-- Create table for storing security scan results
CREATE TABLE IF NOT EXISTS plugin_security_scan (
    id SERIAL PRIMARY KEY,
    plugin_id INTEGER NOT NULL REFERENCES plugin(id) ON DELETE CASCADE,
    scan_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scan_duration INTERVAL,
    score INTEGER NOT NULL,
    safe BOOLEAN NOT NULL,
    galaxy_safe BOOLEAN NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    checksum VARCHAR(64),
    recommendation TEXT,
    scan_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security scan table
CREATE INDEX IF NOT EXISTS idx_plugin_security_scan_plugin_id ON plugin_security_scan(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_scan_time ON plugin_security_scan(scan_time);
CREATE INDEX IF NOT EXISTS idx_plugin_security_scan_safe ON plugin_security_scan(safe);

-- Create table for storing security issues
CREATE TABLE IF NOT EXISTS plugin_security_issue (
    id SERIAL PRIMARY KEY,
    scan_id INTEGER NOT NULL REFERENCES plugin_security_scan(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    file_path VARCHAR(500),
    line_number INTEGER,
    code_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security issues table
CREATE INDEX IF NOT EXISTS idx_plugin_security_issue_scan_id ON plugin_security_issue(scan_id);
CREATE INDEX IF NOT EXISTS idx_plugin_security_issue_severity ON plugin_security_issue(severity);

-- Create table for storing security warnings
CREATE TABLE IF NOT EXISTS plugin_security_warning (
    id SERIAL PRIMARY KEY,
    scan_id INTEGER NOT NULL REFERENCES plugin_security_scan(id) ON DELETE CASCADE,
    warning_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    file_path VARCHAR(500),
    line_number INTEGER,
    code_snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security warnings table
CREATE INDEX IF NOT EXISTS idx_plugin_security_warning_scan_id ON plugin_security_warning(scan_id); 