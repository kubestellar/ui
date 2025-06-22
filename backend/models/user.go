package models

import (
	"time"

	"github.com/lib/pq"
)

type Permission string

const (
	PermissionRead  Permission = "read"
	PermissionWrite Permission = "write"
	PermissionAdmin Permission = "admin"
)

// User represents an authenticated user
type User struct {
	ID          uint           `gorm:"primaryKey;autoIncrement"`
	Username    string         `gorm:"unique;not null"`
	Password    string         `gorm:"not null"`
	Permissions pq.StringArray `gorm:"type:user_permission_enum[];not null;default:'{read}'"`
	CreatedAt   time.Time      `gorm:"autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"autoUpdateTime"`
}

type UserResponse struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

// HasPermission checks if a user has a specific permission
// func (u *User) HasPermission(permission string) bool {
// 	for _, p := range u.Permissions {
// 		if p == permission {
// 			return true
// 		}
// 	}
// 	return false
// }

// // HasAnyPermission checks if the user has any of the specified permissions
// func (u *User) HasAnyPermission(permissions ...string) bool {
// 	for _, requiredPermission := range permissions {
// 		if u.HasPermission(requiredPermission) {
// 			return true
// 		}
// 	}
// 	return false
// }

// // HasAllPermissions checks if the user has all of the specified permissions
// func (u *User) HasAllPermissions(permissions ...string) bool {
// 	for _, requiredPermission := range permissions {
// 		if !u.HasPermission(requiredPermission) {
// 			return false
// 		}
// 	}
// 	return true
// }

// // IsAdmin checks if the user has admin permissions
// func (u *User) IsAdmin() bool {
// 	return u.HasPermission("admin")
// }
