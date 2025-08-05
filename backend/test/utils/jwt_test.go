package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kubestellar/ui/backend/utils"
)

func TestInitJWT(t *testing.T) {
	t.Run("should initialize JWT secret", func(t *testing.T) {
		secret := "test-secret-key"
		utils.InitJWT(secret)

		// Test by generating and validating a token
		token, err := utils.GenerateToken("testuser", false, map[string]string{}, 1)
		if err != nil {
			t.Errorf("Failed to generate token after InitJWT: %v", err)
		}

		claims, err := utils.ValidateToken(token)
		if err != nil {
			t.Errorf("Failed to validate token after InitJWT: %v", err)
		}

		if claims.Username != "testuser" {
			t.Errorf("Expected username 'testuser', got %s", claims.Username)
		}
	})
}

func TestGenerateToken(t *testing.T) {
	// Initialize JWT for testing
	utils.InitJWT("test-secret-key")

	t.Run("should generate valid token for admin user", func(t *testing.T) {
		username := "admin"
		isAdmin := true
		permissions := map[string]string{
			"read":  "true",
			"write": "true",
		}

		token, err := utils.GenerateToken(username, isAdmin, permissions, 1)
		if err != nil {
			t.Errorf("Failed to generate token: %v", err)
		}

		if token == "" {
			t.Error("Generated token should not be empty")
		}

		// Validate the token
		claims, err := utils.ValidateToken(token)
		if err != nil {
			t.Errorf("Failed to validate generated token: %v", err)
		}

		if claims.Username != username {
			t.Errorf("Expected username %s, got %s", username, claims.Username)
		}

		if claims.IsAdmin != isAdmin {
			t.Errorf("Expected isAdmin %v, got %v", isAdmin, claims.IsAdmin)
		}

		if len(claims.Permissions) != len(permissions) {
			t.Errorf("Expected %d permissions, got %d", len(permissions), len(claims.Permissions))
		}

		for key, value := range permissions {
			if claims.Permissions[key] != value {
				t.Errorf("Expected permission %s=%s, got %s", key, value, claims.Permissions[key])
			}
		}
	})

	t.Run("should generate valid token for regular user", func(t *testing.T) {
		username := "user"
		isAdmin := false
		permissions := map[string]string{
			"read": "true",
		}

		token, err := utils.GenerateToken(username, isAdmin, permissions, 1)
		if err != nil {
			t.Errorf("Failed to generate token: %v", err)
		}

		claims, err := utils.ValidateToken(token)
		if err != nil {
			t.Errorf("Failed to validate generated token: %v", err)
		}

		if claims.IsAdmin != false {
			t.Errorf("Expected isAdmin to be false, got %v", claims.IsAdmin)
		}
	})

	t.Run("should generate token with correct expiration", func(t *testing.T) {
		beforeGeneration := time.Now()
		token, err := utils.GenerateToken("testuser", false, map[string]string{}, 1)
		afterGeneration := time.Now()

		if err != nil {
			t.Errorf("Failed to generate token: %v", err)
		}

		claims, err := utils.ValidateToken(token)
		if err != nil {
			t.Errorf("Failed to validate token: %v", err)
		}

		// Check that the token expires in approximately 24 hours (with 1-minute tolerance)
		expectedExpiry := beforeGeneration.Add(24 * time.Hour)
		actualExpiry := claims.ExpiresAt.Time

		if actualExpiry.Before(expectedExpiry.Add(-time.Minute)) || actualExpiry.After(afterGeneration.Add(24*time.Hour+time.Minute)) {
			t.Errorf("Token expiry time %v is not within expected range around %v", actualExpiry, expectedExpiry)
		}

		// Check that IssuedAt is within the generation time frame (with 1-second tolerance)
		if claims.IssuedAt.Time.Before(beforeGeneration.Add(-time.Second)) || claims.IssuedAt.Time.After(afterGeneration.Add(time.Second)) {
			t.Errorf("Token IssuedAt time %v is not within generation time frame %v to %v", claims.IssuedAt.Time, beforeGeneration, afterGeneration)
		}
	})
}

func TestValidateToken(t *testing.T) {
	utils.InitJWT("test-secret-key")

	t.Run("should validate correct token", func(t *testing.T) {
		token, err := utils.GenerateToken("testuser", true, map[string]string{"read": "true"}, 1)
		if err != nil {
			t.Fatalf("Failed to generate token: %v", err)
		}

		claims, err := utils.ValidateToken(token)
		if err != nil {
			t.Errorf("Failed to validate token: %v", err)
		}

		if claims.Username != "testuser" {
			t.Errorf("Expected username 'testuser', got %s", claims.Username)
		}
	})

	t.Run("should reject invalid token string", func(t *testing.T) {
		invalidToken := "invalid.jwt.token"
		_, err := utils.ValidateToken(invalidToken)
		if err == nil {
			t.Error("Expected error for invalid token, but got none")
		}
	})

	t.Run("should reject empty token", func(t *testing.T) {
		_, err := utils.ValidateToken("")
		if err == nil {
			t.Error("Expected error for empty token, but got none")
		}
	})

	t.Run("should reject token with wrong secret", func(t *testing.T) {
		// Generate token with one secret
		utils.InitJWT("secret1")
		token, err := utils.GenerateToken("testuser", false, map[string]string{}, 1)
		if err != nil {
			t.Fatalf("Failed to generate token: %v", err)
		}

		// Try to validate with different secret
		utils.InitJWT("secret2")
		_, err = utils.ValidateToken(token)
		if err == nil {
			t.Error("Expected error for token with wrong secret, but got none")
		}
	})

	t.Run("should reject manually crafted token", func(t *testing.T) {
		// Create a token with wrong signing method
		claims := &utils.Claims{
			Username: "testuser",
			IsAdmin:  false,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}

		// Use wrong signing method
		token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
		tokenString, _ := token.SignedString([]byte("wrong-key"))

		_, err := utils.ValidateToken(tokenString)
		if err == nil {
			t.Error("Expected error for token with wrong signing method, but got none")
		}
	})
}

func TestClaims(t *testing.T) {
	t.Run("should create claims with all fields", func(t *testing.T) {
		username := "testuser"
		isAdmin := true
		permissions := map[string]string{
			"read":   "true",
			"write":  "true",
			"delete": "false",
		}

		claims := &utils.Claims{
			Username:    username,
			IsAdmin:     isAdmin,
			Permissions: permissions,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}

		if claims.Username != username {
			t.Errorf("Expected username %s, got %s", username, claims.Username)
		}

		if claims.IsAdmin != isAdmin {
			t.Errorf("Expected isAdmin %v, got %v", isAdmin, claims.IsAdmin)
		}

		if len(claims.Permissions) != len(permissions) {
			t.Errorf("Expected %d permissions, got %d", len(permissions), len(claims.Permissions))
		}
	})
}
