package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}

	http.HandleFunc("/echo", echoHandler)
	http.HandleFunc("/health", healthHandler)

	log.Printf("Echo plugin backend starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func echoHandler(w http.ResponseWriter, r *http.Request) {
	var echo struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&echo); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response := map[string]interface{}{
		"message":   echo.Message,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}