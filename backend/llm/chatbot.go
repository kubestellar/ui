package main

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func ChatbotHandler(c *gin.Context) {
	query := c.Query("q")
	fmt.Println("Received query:", query) // Debugging

	if query == "" {
		fmt.Println("Query parameter 'q' is missing") // Debugging
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	indexPath := "myindex.bleve" // Or get from config
	fmt.Println("Index path:", indexPath) // Debugging

	docs, err := loadDocuments("documents") // This might be inefficient, consider loading once.
	if err != nil {
		fmt.Println("Error loading documents:", err) // Debugging
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load documents"})
		return
	}
	fmt.Println("Loaded documents:", docs) // Debugging

	topDocs, err := SearchIndex(indexPath, query, 3)
	if err != nil {
		fmt.Println("Error during search:", err) // Debugging
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	fmt.Println("Top documents:", topDocs) // Debugging

	if len(topDocs) == 0 {
		fmt.Println("No documents found, calling Gemini without context") // Debugging
		answer, err := AskGemini("", query)
		if err != nil {
			fmt.Println("Error calling Gemini API:", err) // Debugging
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API error"})
			return
		}
		fmt.Println("Gemini answer:", answer) // Debugging
		c.JSON(http.StatusOK, gin.H{"answer": answer})
		return
	}

	context := ""
	for _, doc := range topDocs {
		context += docs[doc] + "\n"
	}
	fmt.Println("Constructed context:", context) // Debugging

	answer, err := AskGemini(context, query)
	if err != nil {
		fmt.Println("Error calling Gemini API with context:", err) // Debugging
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API error"})
		return
	}
	fmt.Println("Gemini answer with context:", answer) // Debugging

	c.JSON(http.StatusOK, gin.H{"answer": answer})
}
