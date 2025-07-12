package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"

	"github.com/blevesearch/bleve/v2"
)

// NOTE: AskGemini function is assumed to be defined elsewhere in your package.
// func AskGemini(context, query string) (string, error)

func chat(indexPath string) {
	// Open the index once, before the loop starts. This is much more efficient.
	index, err := bleve.Open(indexPath)
	if err != nil {
		// If we can't open the index, we can't proceed.
		log.Fatalf("Error opening index: %v", err)
	}
	// Defer closing the index until the chat function exits.
	defer index.Close()

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("\n❓ Ask a question (or type 'exit'): ")
		query, _ := reader.ReadString('\n')
		query = strings.TrimSpace(query)
		if query == "exit" {
			break
		}

		// The index is already open, so we don't need to open/close it in the loop.

		searchRequest := bleve.NewSearchRequest(bleve.NewQueryStringQuery(query))
		// Request that the 'content' field be returned directly in the search result hit.
		searchRequest.Fields = []string{"content"}
		searchRequest.Size = 3 // Get the top 3 results
		searchResult, err := index.Search(searchRequest)
		if err != nil {
			fmt.Println("Search error:", err)
			continue
		}

		if searchResult.Total == 0 {
			fmt.Println("🤖 No relevant docs found.")
			continue
		}

		var context strings.Builder
		for _, hit := range searchResult.Hits {
			// FIX: Access the 'content' field from hit.Fields map.
			// This map contains the fields we requested in searchRequest.Fields.
			// This is much more efficient than fetching the document again.
			if contentVal, ok := hit.Fields["content"].(string); ok {
				context.WriteString(contentVal)
				// Add a separator for clarity when sending to the LLM
				context.WriteString("\n\n")
			}
		}

		// Check if we actually extracted any context
		if context.Len() == 0 {
			fmt.Println("🤖 Relevant docs found, but could not retrieve their content.")
			continue
		}


		fmt.Println("📚 Context sent to Gemini...")
		answer, err := AskGemini(context.String(), query)
		if err != nil {
			fmt.Println("Gemini API error:", err)
			continue
		}
		fmt.Println("\n🤖 Gemini Answer:\n", answer)
	}
}

func main() {
	indexPath := "../data/docs.bleve"

	if _, err := os.Stat(indexPath); os.IsNotExist(err) {
		fmt.Printf("⚠️ Index not found at %s. Running indexer automatically...\n", indexPath)
		cmd := exec.Command("go", "run", "../indexer/main.go")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			log.Fatalf("❌ Failed to run indexer: %v", err)
		}
		fmt.Println("✅ Indexer finished successfully.")
	}

	chat(indexPath)
}