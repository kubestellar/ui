package models

import (
	"errors"

	"github.com/katamyra/kubestellarUI/auth"
)

type User struct {
	ID          int      `json:"id"`
	Username    string   `json:"username"`
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}

// Config struct to hold data from ConfigMap
type Config struct {
	JWTSecret   string `json:"jwt_secret"`
	User        string `json:"user"`
	Password    string `json:"password"`
	Permissions string `json:"permissions"`
}

// Authenticate user against the ConfigMap data
func AuthenticateUser(username, password string) (*User, error) {
	config, err := auth.LoadK8sConfigMap()
	if err != nil {
		return nil, errors.New("authentication system unavailable")
	}

	// Check credentials
	if username != config.User || (config.Password != password && config.Password != "") {
		return nil, errors.New("invalid credentials")
	}

	// Create user object
	user := &User{
		Username:    username,
		Password:    "",
		Permissions: config.Permissions,
	}

	return user, nil
}
