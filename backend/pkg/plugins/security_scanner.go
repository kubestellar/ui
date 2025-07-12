package plugins

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// SecurityScanResult represents the result of a security scan
type SecurityScanResult struct {
	Safe           bool                    `json:"safe"`
	Score          int                     `json:"score"` // 0-100, higher is safer
	Issues         []SecurityIssue         `json:"issues,omitempty"`
	Warnings       []SecurityWarning       `json:"warnings,omitempty"`
	Checksum       string                  `json:"checksum"`
	ScanTime       time.Time               `json:"scanTime"`
	ScanDuration   time.Duration           `json:"scanDuration"`
	FileAnalysis   map[string]FileAnalysis `json:"fileAnalysis,omitempty"`
	OverallRisk    string                  `json:"overallRisk"` // "low", "medium", "high", "critical"
	Recommendation string                  `json:"recommendation"`
	GalaxySafe     bool                    `json:"galaxySafe"` // Galaxy Safe badge
}

// SecurityIssue represents a security issue found during scanning
type SecurityIssue struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"` // "low", "medium", "high", "critical"
	Description string `json:"description"`
	File        string `json:"file,omitempty"`
	Line        int    `json:"line,omitempty"`
	Code        string `json:"code,omitempty"`
}

// SecurityWarning represents a security warning found during scanning
type SecurityWarning struct {
	Type        string `json:"type"`
	Description string `json:"description"`
	File        string `json:"file,omitempty"`
	Line        int    `json:"line,omitempty"`
	Code        string `json:"code,omitempty"`
}

// FileAnalysis contains analysis results for a specific file
type FileAnalysis struct {
	FileType    string   `json:"fileType"`
	Size        int64    `json:"size"`
	Checksum    string   `json:"checksum"`
	Issues      []string `json:"issues,omitempty"`
	Warnings    []string `json:"warnings,omitempty"`
	Permissions string   `json:"permissions,omitempty"`
}

// SecurityScanner handles plugin security scanning
type SecurityScanner struct {
	// Known malicious patterns
	maliciousPatterns []MaliciousPattern
	// Suspicious patterns that require review
	suspiciousPatterns []SuspiciousPattern
	// File size limits
	maxFileSize int64
	// Allowed file extensions
	allowedExtensions map[string]bool
}

// MaliciousPattern represents a pattern that indicates malicious code
type MaliciousPattern struct {
	Name        string
	Pattern     *regexp.Regexp
	Severity    string
	Description string
}

// SuspiciousPattern represents a pattern that might be suspicious
type SuspiciousPattern struct {
	Name        string
	Pattern     *regexp.Regexp
	Description string
}

// NewSecurityScanner creates a new security scanner
func NewSecurityScanner() *SecurityScanner {
	scanner := &SecurityScanner{
		maxFileSize: 50 * 1024 * 1024, // 50MB
		allowedExtensions: map[string]bool{
			".wasm": true,
			".yml":  true,
			".yaml": true,
			".json": true,
			".md":   true,
			".txt":  true,
			".js":   true,
			".css":  true,
			".html": true,
		},
	}

	// Initialize malicious patterns
	scanner.initializeMaliciousPatterns()
	// Initialize suspicious patterns
	scanner.initializeSuspiciousPatterns()

	return scanner
}

// initializeMaliciousPatterns sets up patterns that indicate malicious code
func (ss *SecurityScanner) initializeMaliciousPatterns() {
	ss.maliciousPatterns = []MaliciousPattern{
		{
			Name:        "System Command Execution",
			Pattern:     regexp.MustCompile(`(?i)(system|exec|eval|shell_exec|passthru|popen|proc_open|pcntl_exec)`),
			Severity:    "critical",
			Description: "Potential system command execution detected",
		},
		{
			Name:        "File System Access",
			Pattern:     regexp.MustCompile(`(?i)(file_get_contents|file_put_contents|fopen|unlink|rmdir|mkdir|chmod|chown)`),
			Severity:    "high",
			Description: "File system access operations detected",
		},
		{
			Name:        "Network Access",
			Pattern:     regexp.MustCompile(`(?i)(curl|wget|http_get|file_get_contents.*http|fsockopen|pfsockopen)`),
			Severity:    "high",
			Description: "Network access operations detected",
		},
		{
			Name:        "Database Access",
			Pattern:     regexp.MustCompile(`(?i)(mysql_|mysqli_|pdo_|sqlite_|postgres_|mongo_)`),
			Severity:    "high",
			Description: "Database access operations detected",
		},
		{
			Name:        "Encoded/Encrypted Code",
			Pattern:     regexp.MustCompile(`(?i)(base64_decode|gzinflate|gzuncompress|gzdecode|str_rot13)`),
			Severity:    "high",
			Description: "Encoded or encrypted code detected",
		},
		{
			Name:        "Dynamic Code Execution",
			Pattern:     regexp.MustCompile(`(?i)(create_function|call_user_func|call_user_func_array|assert|include|require)`),
			Severity:    "critical",
			Description: "Dynamic code execution detected",
		},
		{
			Name:        "Process Control",
			Pattern:     regexp.MustCompile(`(?i)(pcntl_|posix_|getmypid|getmyuid|getmygid)`),
			Severity:    "high",
			Description: "Process control operations detected",
		},
		{
			Name:        "Environment Access",
			Pattern:     regexp.MustCompile(`(?i)(getenv|putenv|$_ENV|$_SERVER)`),
			Severity:    "medium",
			Description: "Environment variable access detected",
		},
		{
			Name:        "Suspicious WASM Imports",
			Pattern:     regexp.MustCompile(`(?i)(wasi_snapshot_preview1|env\.|import\.)`),
			Severity:    "medium",
			Description: "Suspicious WASM imports detected",
		},
		{
			Name:        "Hardcoded Credentials",
			Pattern:     regexp.MustCompile(`(?i)(password|secret|key|token|credential).*[=:].*[a-zA-Z0-9]{8,}`),
			Severity:    "high",
			Description: "Potential hardcoded credentials detected",
		},
	}
}

// initializeSuspiciousPatterns sets up patterns that might be suspicious
func (ss *SecurityScanner) initializeSuspiciousPatterns() {
	ss.suspiciousPatterns = []SuspiciousPattern{
		{
			Name:        "Large File Size",
			Description: "File size exceeds recommended limits",
		},
		{
			Name:        "Unusual File Extension",
			Description: "File extension not commonly used in plugins",
		},
		{
			Name:        "Binary Content",
			Description: "Binary content detected in text files",
		},
		{
			Name:        "External URLs",
			Description: "External URLs or references detected",
		},
		{
			Name:        "Minified Code",
			Description: "Minified or obfuscated code detected",
		},
	}
}

// ScanPluginArchive scans a plugin archive for security issues
func (ss *SecurityScanner) ScanPluginArchive(archivePath string) (*SecurityScanResult, error) {
	startTime := time.Now()

	result := &SecurityScanResult{
		Safe:         true,
		Score:        100,
		ScanTime:     startTime,
		FileAnalysis: make(map[string]FileAnalysis),
	}

	// Extract archive to temporary directory
	tempDir, err := os.MkdirTemp("", "security_scan_*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Extract the archive
	if err := ss.extractArchive(archivePath, tempDir); err != nil {
		return nil, fmt.Errorf("failed to extract archive: %v", err)
	}

	// Scan all files in the extracted directory
	if err := ss.scanDirectory(tempDir, result); err != nil {
		return nil, fmt.Errorf("failed to scan directory: %v", err)
	}

	// Calculate overall score and risk level
	ss.calculateOverallScore(result)

	result.ScanDuration = time.Since(startTime)
	result.GalaxySafe = result.Safe && result.Score >= 80

	return result, nil
}

// extractArchive extracts a tar.gz archive to a directory
func (ss *SecurityScanner) extractArchive(archivePath, extractDir string) error {
	file, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzr, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzr.Close()

	tr := tar.NewReader(gzr)

	for {
		header, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// Skip if it's a directory
		if header.Typeflag == tar.TypeDir {
			continue
		}

		// Create the file path
		target := filepath.Join(extractDir, header.Name)

		// Create the directory if it doesn't exist
		if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
			return err
		}

		// Create the file
		file, err := os.Create(target)
		if err != nil {
			return err
		}

		// Copy the file content
		if _, err := io.Copy(file, tr); err != nil {
			file.Close()
			return err
		}
		file.Close()
	}

	return nil
}

// scanDirectory recursively scans a directory for security issues
func (ss *SecurityScanner) scanDirectory(dirPath string, result *SecurityScanResult) error {
	return filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Get relative path
		relPath, err := filepath.Rel(dirPath, path)
		if err != nil {
			return err
		}

		// Analyze the file
		fileAnalysis := ss.analyzeFile(path, relPath, info)
		result.FileAnalysis[relPath] = fileAnalysis

		// Add issues and warnings to overall result
		for _, issue := range fileAnalysis.Issues {
			// Extract severity from the issue description
			severity := "medium" // default
			for _, pattern := range ss.maliciousPatterns {
				if strings.Contains(issue, pattern.Name) {
					severity = pattern.Severity
					break
				}
			}

			result.Issues = append(result.Issues, SecurityIssue{
				Type:        "file_issue",
				Severity:    severity,
				Description: issue,
				File:        relPath,
			})
		}

		for _, warning := range fileAnalysis.Warnings {
			result.Warnings = append(result.Warnings, SecurityWarning{
				Type:        "file_warning",
				Description: warning,
				File:        relPath,
			})
		}

		return nil
	})
}

// analyzeFile analyzes a single file for security issues
func (ss *SecurityScanner) analyzeFile(filePath, relPath string, info os.FileInfo) FileAnalysis {
	analysis := FileAnalysis{
		FileType: filepath.Ext(filePath),
		Size:     info.Size(),
	}

	// Calculate checksum
	if checksum, err := ss.calculateChecksum(filePath); err == nil {
		analysis.Checksum = checksum
	}

	// Check file size
	if info.Size() > ss.maxFileSize {
		analysis.Warnings = append(analysis.Warnings, "File size exceeds recommended limit")
	}

	// Check file extension
	if !ss.allowedExtensions[strings.ToLower(filepath.Ext(filePath))] {
		analysis.Warnings = append(analysis.Warnings, "Unusual file extension")
	}

	// Analyze file content for text-based files
	if ss.isTextFile(filePath) {
		content, err := os.ReadFile(filePath)
		if err == nil {
			ss.analyzeContent(string(content), relPath, &analysis)
		}
	}

	return analysis
}

// isTextFile checks if a file is a text file
func (ss *SecurityScanner) isTextFile(filePath string) bool {
	ext := strings.ToLower(filepath.Ext(filePath))
	textExtensions := map[string]bool{
		".yml":  true,
		".yaml": true,
		".json": true,
		".md":   true,
		".txt":  true,
		".js":   true,
		".css":  true,
		".html": true,
		".go":   true,
		".py":   true,
		".sh":   true,
		".bat":  true,
		".ps1":  true,
		".php":  true,
	}
	return textExtensions[ext]
}

// analyzeContent analyzes file content for malicious patterns
func (ss *SecurityScanner) analyzeContent(content, filePath string, analysis *FileAnalysis) {
	lines := strings.Split(content, "\n")

	for lineNum, line := range lines {
		lineNum++ // Convert to 1-based line numbers

		// Check for malicious patterns
		for _, pattern := range ss.maliciousPatterns {
			if pattern.Pattern.MatchString(line) {
				analysis.Issues = append(analysis.Issues,
					fmt.Sprintf("%s (line %d): %s", pattern.Name, lineNum, pattern.Description))
			}
		}

		// Check for suspicious patterns
		for _, pattern := range ss.suspiciousPatterns {
			if pattern.Pattern != nil && pattern.Pattern.MatchString(line) {
				analysis.Warnings = append(analysis.Warnings,
					fmt.Sprintf("%s (line %d): %s", pattern.Name, lineNum, pattern.Description))
			}
		}
	}

	// Additional checks
	ss.checkForMinifiedCode(content, analysis)
	ss.checkForExternalURLs(content, analysis)
	ss.checkForBinaryContent(content, analysis)
}

// checkForMinifiedCode checks if code is minified or obfuscated
func (ss *SecurityScanner) checkForMinifiedCode(content string, analysis *FileAnalysis) {
	// Check for very long lines (common in minified code)
	lines := strings.Split(content, "\n")
	longLineCount := 0
	for _, line := range lines {
		if len(line) > 200 {
			longLineCount++
		}
	}

	if longLineCount > len(lines)/2 {
		analysis.Warnings = append(analysis.Warnings, "Code appears to be minified or obfuscated")
	}
}

// checkForExternalURLs checks for external URLs
func (ss *SecurityScanner) checkForExternalURLs(content string, analysis *FileAnalysis) {
	urlPattern := regexp.MustCompile(`https?://[^\s<>"{}|\\^` + "`" + `\[\]]+`)
	urls := urlPattern.FindAllString(content, -1)

	if len(urls) > 0 {
		analysis.Warnings = append(analysis.Warnings,
			fmt.Sprintf("External URLs detected: %d found", len(urls)))
	}
}

// checkForBinaryContent checks if text file contains binary content
func (ss *SecurityScanner) checkForBinaryContent(content string, analysis *FileAnalysis) {
	// Check for null bytes or other binary indicators
	if strings.Contains(content, "\x00") {
		analysis.Issues = append(analysis.Issues, "Binary content detected in text file")
	}
}

// calculateChecksum calculates SHA256 checksum of a file
func (ss *SecurityScanner) calculateChecksum(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return hex.EncodeToString(hash.Sum(nil)), nil
}

// calculateOverallScore calculates the overall security score
func (ss *SecurityScanner) calculateOverallScore(result *SecurityScanResult) {
	score := 100

	// Deduct points for issues
	highOrCriticalCount := 0
	for _, issue := range result.Issues {
		switch issue.Severity {
		case "critical":
			score -= 30
			highOrCriticalCount++
		case "high":
			score -= 20
			highOrCriticalCount++
		case "medium":
			score -= 10
		case "low":
			score -= 5
		}
	}

	// If there are 2 or more high/critical issues, set score to 0 and mark unsafe
	if highOrCriticalCount >= 2 {
		score = 0
		result.Safe = false
	}

	// Deduct points for warnings
	for range result.Warnings {
		score -= 2
	}

	// Ensure score doesn't go below 0
	if score < 0 {
		score = 0
	}

	result.Score = score

	// Determine overall risk level
	if score >= 80 {
		result.OverallRisk = "low"
		result.Recommendation = "Plugin appears safe for installation"
	} else if score >= 60 {
		result.OverallRisk = "medium"
		result.Recommendation = "Plugin has some security concerns, review recommended"
	} else if score >= 40 {
		result.OverallRisk = "high"
		result.Recommendation = "Plugin has significant security concerns, manual review required"
	} else {
		result.OverallRisk = "critical"
		result.Recommendation = "Plugin has critical security issues, installation not recommended"
	}

	// Mark as unsafe if score is too low or critical issues found
	if score < 50 {
		result.Safe = false
	}

	// Check for critical issues
	for _, issue := range result.Issues {
		if issue.Severity == "critical" {
			result.Safe = false
			break
		}
	}
}
