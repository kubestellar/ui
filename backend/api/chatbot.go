package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
	"github.com/gin-gonic/gin"
	"k8s.io/klog/v2"
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
    apiKey := os.Getenv("GEMINI_API_KEY") // It's better to use an environment variable for the API key
    if apiKey == "" {
        apiKey = "redacted" // Fallback for now
    }
    url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey

    systemPrompt := `You are a helpful AI assistant embedded in the Kubestellar UI.
Your job is to answer user questions, resolve their issues, and guide them through using or troubleshooting features.`

    fullPrompt := systemPrompt + "\n\n" + "Context:\n" + context + "\n\nQuestion:\n" + question

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
    resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    if c, ok := result["candidates"].([]interface{}); ok && len(c) > 0 {
        content := c[0].(map[string]interface{})["content"]
        parts := content.(map[string]interface{})["parts"].([]interface{})
        return parts[0].(map[string]interface{})["text"].(string), nil
    }

    return "No answer", nil
}

// SearchIndex function
func SearchIndex(indexPath, query string, topK int) ([]string, error) {
	index, err := bleve.Open(indexPath)
	if err != nil {
		return nil, err
	}
	defer index.Close()

	search := bleve.NewSearchRequestOptions(bleve.NewQueryStringQuery(query), topK, 0, false)
	result, err := index.Search(search)
	if err != nil {
		return nil, err
	}

	var hits []string
	for _, hit := range result.Hits {
		hits = append(hits, hit.ID)
	}
	return hits, nil
}

// loadDocuments function
func loadDocuments(dir string) (map[string]string, error) {
	docs := make(map[string]string)
	// Correct the path to be relative to the backend executable
	docPath := filepath.Join("data", "docs") 
	err := filepath.Walk(docPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if strings.HasSuffix(info.Name(), ".txt") || strings.HasSuffix(info.Name(), ".md") {
			content, err := os.ReadFile(path)
			if err != nil {
				return err	
			}
			docs[info.Name()] = strings.ToLower(string(content))
		}
		return nil
	})
	return docs, err
}


// ChatbotHandler is the main handler for the /api/chatbot endpoint
func ChatbotHandler(c *gin.Context) {
	klog.Infof("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^&^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^666")
	klog.Infof("ChatbotHandler invoked")

	query := c.Query("q")
	klog.Infof("Query received: %s", query)
	if query == "" {
		klog.Infof("Missing query parameter")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	indexPath := filepath.Join("data", "docs.bleve")
	klog.Infof("Using index path: %s", indexPath)

	docs, err := loadDocuments("documents")
	if err != nil {
		klog.Errorf("Failed to load documents: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load documents"})
		return
	}
	klog.Infof("Loaded %d documents", len(docs))

	topDocs, err := SearchIndex(indexPath, query, 3)
	if err != nil {
		klog.Errorf("SearchIndex error: %v", err)
		if _, statErr := os.Stat(indexPath); os.IsNotExist(statErr) {
			klog.Errorf("Index does not exist at path: %s", indexPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Search index not found."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}
	klog.Infof("Top documents returned: %v", topDocs)

	var context string
	if len(topDocs) > 0 {
		for _, doc := range topDocs {
			klog.Infof("Adding document to context: %s", doc)
			context += docs[doc] + "\n"
		}
	}

	klog.Infof("Sending query to Gemini API")
	answer, err := AskGemini(context, query)
	if err != nil {
		klog.Errorf("Gemini API error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini API error"})
		return
	}

	klog.Infof("Received answer from Gemini: %s", answer)
	c.JSON(http.StatusOK, gin.H{"answer": answer, "sources": topDocs})
	klog.Infof("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^&^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^666")
}
