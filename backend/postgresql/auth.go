package postgresql

import (
	models "github.com/kubestellar/ui/models"
)

func CreateUser(user *models.User) error {
	if err := DB.Create(user).Error; err != nil {
		return err
	}
	return nil
}

func GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	err := DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}
