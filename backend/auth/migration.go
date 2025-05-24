package auth

import (
	"fmt"
	"log"
)

// MigratePasswordsToHash migrates all plaintext passwords in the ConfigMap to bcrypt hashes
// Returns the count of migrated passwords and any error encountered
func MigratePasswordsToHash() (int, error) {
	// Load the current config
	config, err := LoadK8sConfigMap()
	if err != nil {
		return 0, fmt.Errorf("failed to load config: %v", err)
	}

	// Track number of migrations
	migratedCount := 0
	migrationRequired := false

	// Check each user's password and migrate if needed
	for username, userConfig := range config.Users {
		hashedPassword, migrated, err := MigratePasswordHash(userConfig.Password)
		if err != nil {
			return migratedCount, fmt.Errorf("error migrating password for user %s: %v", username, err)
		}

		if migrated {
			// Update the password in the config
			userConfig.Password = hashedPassword
			config.Users[username] = userConfig
			migratedCount++
			migrationRequired = true
			log.Printf("Migrated password for user: %s", username)
		}
	}

	// Save the config if any passwords were migrated
	if migrationRequired {
		if err := SaveConfig(config); err != nil {
			return migratedCount, fmt.Errorf("failed to save migrated passwords: %v", err)
		}
		log.Printf("Successfully migrated %d passwords to bcrypt hashes", migratedCount)
	}

	return migratedCount, nil
}
