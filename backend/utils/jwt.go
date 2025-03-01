package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	jwtconfig "github.com/katamyra/kubestellarUI/jwt"
)

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Generate JWT token
func GenerateToken(username string) (string, error) {
	expirationTime := time.Now().Add(1 * time.Hour)

	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtconfig.GetJWTSecret()))
}
