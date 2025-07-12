package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/blevesearch/bleve/v2"
	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// GeminiRequest and AskGemini function
type GeminiRequest struct {
	Contents []struct {
		Role  string `json:"role"`
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	} `json:"contents"`
}

func AskGemini(context string, question string) (string, error) {
	fmt.Println("AskGemini invoked")
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		apiKey = "AIzaSyDUEf8NPEBNtXj17fO22QyPm4NEmIK58Bo"
	}
	fmt.Println("Using API key:", apiKey)
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey

	systemPrompt := `You are a helpful AI assistant embedded in the Kubestellar UI.
Your job is to answer user questions, resolve their issues, and guide them through using or troubleshooting features.`

	fullPrompt := systemPrompt + "\n\n" + "Context:\n" + context + "\n\nQuestion:\n" + question
	fmt.Println("Full prompt:", fullPrompt)

	body := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"role": "user",
				"parts": []map[string]string{
					{"text": fullPrompt},
				},
			},
		},
	}

	jsonBody, _ := json.Marshal(body)
	fmt.Println("Request body:", string(jsonBody))
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Println("HTTP POST error:", err)
		return "", err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	fmt.Println("Response from Gemini API:", result)

	if c, ok := result["candidates"].([]interface{}); ok && len(c) > 0 {
		content := c[0].(map[string]interface{})["content"]
		parts := content.(map[string]interface{})["parts"].([]interface{})
		return parts[0].(map[string]interface{})["text"].(string), nil
	}

	return "No answer", nil
}

// SearchIndex function
func SearchIndex(indexPath, query string, topK int) ([]string, error) {
	fmt.Println("SearchIndex invoked with query:", query)
	index, err := bleve.Open(indexPath)
	if err != nil {
		fmt.Println("Failed to open index:", err)
		return nil, err
	}
	defer index.Close()

	search := bleve.NewSearchRequestOptions(bleve.NewQueryStringQuery(query), topK, 0, false)
	result, err := index.Search(search)
	if err != nil {
		fmt.Println("Search error:", err)
		return nil, err
	}

	var hits []string
	for _, hit := range result.Hits {
		hits = append(hits, hit.ID)
	}
	fmt.Println("Search hits:", hits)
	return hits, nil
}

// loadDocuments function
func loadDocuments(dir string) (map[string]string, error) {
	fmt.Println("loadDocuments invoked")
	docs := make(map[string]string)
	docPath := filepath.Join("data", "docs")
	fmt.Println("Document path:", docPath)
	err := filepath.Walk(docPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			fmt.Println("Error walking path:", err)
			return err
		}
		if info.IsDir() {
			return nil
		}
		if strings.HasSuffix(info.Name(), ".txt") || strings.HasSuffix(info.Name(), ".md") {
			content, err := os.ReadFile(path)
			if err != nil {
				fmt.Println("Error reading file:", err)
				return err
			}
			docs[info.Name()] = strings.ToLower(string(content))
		}
		return nil
	})
	fmt.Println("Loaded documents:", docs)
	return docs, err
}

// ChatbotHandler is the main handler for the /api/chatbot endpoint
// func ChatbotHandler(c *gin.Context) {
// 	fmt.Println("ChatbotHandler invoked")
// 	klog.Infof("ChatbotHandler invoked")

// 	query := c.Query("q")
// 	fmt.Println("Query received:", query)
// 	if query == "" {
// 		fmt.Println("Missing query parameter")
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
// 		return
// 	}

// 	indexPath := filepath.Join("data", "docs.bleve")
// 	fmt.Println("Using index path:", indexPath)

// 	docs, err := loadDocuments("documents")
// 	if err != nil {
// 		fmt.Println("Failed to load documents:", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load documents"})
// 		return
// 	}
// 	fmt.Println("Loaded documents count:", len(docs))

// 	topDocs, err := SearchIndex(indexPath, query, 3)
// 	if err != nil {
// 		fmt.Println("SearchIndex error:", err)
// 		if _, statErr := os.Stat(indexPath); os.IsNotExist(statErr) {
// 			fmt.Println("Index does not exist at path:", indexPath)
// 			c.JSON(http.StatusInternalServerError, gin.H{"error": "Search index not found."})
// 			return
// 		}
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
// 		return
// 	}
// 	fmt.Println("Top documents returned:", topDocs)

// 	var context string
// 	if len(topDocs) > 0 {
// 		for _, doc := range topDocs {
// 			fmt.Println("Adding document to context:", doc)
// 			context += docs[doc] + "\n"
// 		}
// 	}

// 	fmt.Println("Sending query to Gemini API")
// 	answer, err := AskGemini(context, query)
// 	if err != nil {
// 		fmt.Println("Gemini API error:", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API error"})
// 		return
// 	}

// 	fmt.Println("Received answer from Gemini:", answer)
// 	c.JSON(http.StatusOK, gin.H{"answer": answer, "sources": topDocs})
// }

func ChatbotHandler(c *gin.Context) {
	fmt.Println("ChatbotHandler invoked")
	klog.Infof("ChatbotHandler invoked")

	query := c.Query("q")
	fmt.Println("Query received:", query)
	if query == "" {
		fmt.Println("Missing query parameter")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	indexPath := filepath.Join("data", "docs.bleve")
	fmt.Println("Using index path:", indexPath)

	docs, err := loadDocuments("documents")
	if err != nil {
		fmt.Println("Failed to load documents:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load documents"})
		return
	}
	fmt.Println("Loaded documents count:", len(docs))

	topDocs, err := SearchIndex(indexPath, query, 3)
	if err != nil {
		fmt.Println("SearchIndex error:", err)
		if _, statErr := os.Stat(indexPath); os.IsNotExist(statErr) {
			fmt.Println("Index does not exist at path:", indexPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Search index not found."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	fmt.Println("Top documents returned:", topDocs)

	var context string
	if len(topDocs) > 0 {
		for _, doc := range topDocs {
			fmt.Println("Adding document to context:", doc)
			context += docs[doc] + "\n"
		}
	}

	fmt.Println("Sending query to Gemini API")
	answer, err := AskGemini(context, query)
	if err != nil {
		fmt.Println("Gemini API error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API error"})
		return
	}

	fmt.Println("Received answer from Gemini:", answer)
	c.JSON(http.StatusOK, gin.H{"answer": answer, "sources": topDocs})
}
