package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	jwtconfig "github.com/kubestellar/ui/jwt"
)

// TokenClaims represents the JWT token claims
type TokenClaims struct {
	Username    string   `json:"username"`
	Permissions []string `json:"permissions,omitempty"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for a user with specified permissions
func GenerateToken(username string, permissions []string) (string, error) {
	// Set token expiration time (from environment or default to 24 hours)
	expTime := jwtconfig.GetTokenExpiration()
	if expTime <= 0 {
		expTime = 24 * time.Hour // Default to 24 hours
	}

	// Create the claims
	claims := TokenClaims{
		Username:    username,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expTime)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "kubestellar-ui",
		},
	}

	// Create token with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign token with secret
	tokenString, err := token.SignedString([]byte(jwtconfig.GetJWTSecret()))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the parsed claims
func ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&TokenClaims{},
		func(token *jwt.Token) (interface{}, error) {
			// Validate the alg is what we expect
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtconfig.GetJWTSecret()), nil
		},
	)

	if err != nil {
		return nil, fmt.Errorf("invalid token: %v", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Extract claims
	claims, ok := token.Claims.(*TokenClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
