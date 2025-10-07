package utils

import (
	"errors"
	"regexp"
	"strings"
)

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// ValidateUsername checks if username contains only allowed characters
func ValidateUsername(username string) error {
	username = strings.TrimSpace(username)

	if username == "" {
		return errors.New("username is required")
	}

	if len(username) < 3 {
		return errors.New("username must be at least 3 characters long")
	}

	if len(username) > 50 {
		return errors.New("username must be less than 50 characters")
	}

	if !usernameRegex.MatchString(username) {
		return errors.New("username can only contain letters, numbers, underscore, and hyphen")
	}

	return nil
}

// ValidatePassword checks password requirements
func ValidatePassword(password string) error {
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters long")
	}

	return nil
}
