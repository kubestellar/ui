package models

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"time"

	database "github.com/kubestellar/ui/backend/postgresql/Database"
)

type RefreshToken struct {
	ID         int
	UserID     int
	TokenHash  string
	ExpiresAt  sql.NullTime
	CreatedAt  time.Time
	LastUsedAt sql.NullTime
}

var ErrRefreshTokenNotFound = errors.New("refresh token not found")

func hashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func ReplaceRefreshToken(userID int, token string, expiresAt *time.Time) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM refresh_tokens WHERE user_id = $1", userID); err != nil {
		return err
	}

	hashed := hashRefreshToken(token)
	var expires sql.NullTime
	if expiresAt != nil {
		expires = sql.NullTime{Time: *expiresAt, Valid: true}
	}
	if _, err := tx.Exec(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, userID, hashed, expires); err != nil {
		return err
	}

	return tx.Commit()
}

func GetRefreshTokenByToken(token string) (*RefreshToken, error) {
	hashed := hashRefreshToken(token)

	row := database.DB.QueryRow(`SELECT id, user_id, token_hash, expires_at, created_at, last_used_at FROM refresh_tokens WHERE token_hash = $1`, hashed)

	var rt RefreshToken
	if err := row.Scan(&rt.ID, &rt.UserID, &rt.TokenHash, &rt.ExpiresAt, &rt.CreatedAt, &rt.LastUsedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRefreshTokenNotFound
		}
		return nil, err
	}

	return &rt, nil
}

func UpdateRefreshTokenUsage(id int) error {
	_, err := database.DB.Exec("UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1", id)
	return err
}

func DeleteRefreshTokenByID(id int) error {
	_, err := database.DB.Exec("DELETE FROM refresh_tokens WHERE id = $1", id)
	return err
}
