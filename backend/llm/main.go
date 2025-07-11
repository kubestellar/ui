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

func chat(indexPath string) {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("\n❓ Ask a question (or type 'exit'): ")
		query, _ := reader.ReadString('\n')
		query = strings.TrimSpace(query)
		if query == "exit" {
			break
		}

		index, err := bleve.Open(indexPath)
		if err != nil {
			fmt.Println("Error opening index:", err)
			continue
		}

		searchRequest := bleve.NewSearchRequest(bleve.NewQueryStringQuery(query))
		searchRequest.Fields = []string{"content"}
		searchRequest.Size = 3
		searchResult, err := index.Search(searchRequest)
		if err != nil {
			fmt.Println("Search error:", err)
			index.Close()
			continue
		}

		if searchResult.Total == 0 {
			fmt.Println("🤖 No relevant docs found.")
			index.Close()
			continue
		}

		var context strings.Builder
		for _, hit := range searchResult.Hits {
			// The content is not directly available in the search result by default
			// We need to retrieve it from the index
			doc, err := index.Document(hit.ID)
			if err != nil {
				fmt.Println("Error retrieving document:", err)
				continue
			}
			for _, field := range doc.Fields {
				if field.Name() == "content" {
					context.Write(field.Value())
					context.WriteString("\n")
				}
			}
		}
		index.Close()

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
