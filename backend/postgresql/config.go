package postgresql

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

var DB *sql.DB

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found. Using default values.")
	}
}

func ConnectDB() {
	LoadConfig()

	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"), os.Getenv("POSTGRES_PORT"),
		os.Getenv("POSTGRES_USER"), os.Getenv("POSTGRES_PASSWORD"),
		os.Getenv("POSTGRES_DB"),
	)

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Database not responding:", err)
	}

	fmt.Println("✅ Connected to PostgreSQL")
}
