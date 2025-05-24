package auth

import (
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptPrefix is used to identify bcrypt hashed passwords
	BcryptPrefix = "$2a$"

	// DefaultCost for bcrypt algorithm
	DefaultCost = 10
)

// HashPassword creates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	if password == "" {
		return "", nil // Empty passwords remain empty (for backward compatibility)
	}

	bytes, err := bcrypt.GenerateFromPassword([]byte(password), DefaultCost)
	if err != nil {
		return "", fmt.Errorf("error hashing password: %v", err)
	}
	return string(bytes), nil
}

// CheckPassword compares a password against a hash
// It handles both plain text (for backward compatibility) and bcrypt hashed passwords
func CheckPassword(password, hash string) bool {
	if hash == "" {
		// Empty hash in config means password check is disabled
		return true
	}

	// Check if the hash is a bcrypt hash
	if strings.HasPrefix(hash, BcryptPrefix) {
		// Compare with bcrypt
		err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
		return err == nil
	}

	// Legacy path: direct comparison for non-bcrypt passwords
	return password == hash
}

// IsBcryptHash checks if a given string is a bcrypt hash
func IsBcryptHash(s string) bool {
	return strings.HasPrefix(s, BcryptPrefix)
}

// MigratePasswordHash checks if a password is stored as plain text and returns a bcrypt hash if needed
// Returns the hash (either existing bcrypt hash or new hash) and a boolean indicating if migration occurred
func MigratePasswordHash(password string) (string, bool, error) {
	// If password is empty or already a bcrypt hash, no migration needed
	if password == "" || IsBcryptHash(password) {
		return password, false, nil
	}

	// Hash the password with bcrypt
	hash, err := HashPassword(password)
	if err != nil {
		return "", false, err
	}

	return hash, true, nil
}
