package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	jwtconfig "github.com/kubestellar/ui/backend/jwt"
)

var jwtSecret []byte

func InitJWT(secret string) {
	jwtSecret = []byte(secret)
}

type Claims struct {
	UserID      int               `json:"user_id"`
	Username    string            `json:"username"`
	IsAdmin     bool              `json:"is_admin"`
	Permissions map[string]string `json:"permissions"`
	TokenType   string            `json:"token_type,omitempty"`
	jwt.RegisteredClaims
}

const (
	tokenTypeAccess  = "access"
	tokenTypeRefresh = "refresh"
)

// GenerateToken creates a JWT token for the user
func GenerateToken(username string, isAdmin bool, permissions map[string]string, userID int) (string, error) {
	return generateToken(username, isAdmin, permissions, userID, tokenTypeAccess, jwtconfig.GetTokenExpiration())
}

// ValidateToken validates a JWT token and returns claims
func ValidateToken(tokenString string) (*Claims, error) {
	return validateTokenOfType(tokenString, tokenTypeAccess)
}

// GenerateRefreshToken creates a refresh JWT for the user
func GenerateRefreshToken(username string, userID int) (string, error) {
	return generateToken(username, false, nil, userID, tokenTypeRefresh, jwtconfig.GetRefreshTokenExpiration())
}

// ValidateRefreshToken validates a refresh token and returns claims
func ValidateRefreshToken(tokenString string) (*Claims, error) {
	return validateTokenOfType(tokenString, tokenTypeRefresh)
}

func generateToken(username string, isAdmin bool, permissions map[string]string, userID int, tokenType string, expiry time.Duration) (string, error) {
	registeredClaims := jwt.RegisteredClaims{
		IssuedAt: jwt.NewNumericDate(time.Now()),
	}

	if expiry > 0 {
		registeredClaims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(expiry))
	}

	claims := &Claims{
		UserID:           userID,
		Username:         username,
		IsAdmin:          isAdmin,
		Permissions:      permissions,
		TokenType:        tokenType,
		RegisteredClaims: registeredClaims,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func validateTokenOfType(tokenString string, expectedType string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	if claims.TokenType != "" && claims.TokenType != expectedType {
		return nil, fmt.Errorf("invalid token type")
	}

	return claims, nil
}
