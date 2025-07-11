package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/blevesearch/bleve/v2"
)

func loadDocuments(dir string) (map[string]string, error) {
	docs := make(map[string]string)
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
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
			// Use the relative path from the docs directory as the ID
			relPath, _ := filepath.Rel(dir, path)
			docs[relPath] = strings.ToLower(string(content))
		}
		return nil
	})
	return docs, err
}

func main() {
	docsPath := "../data/docs"
	indexPath := "../data/docs.bleve"

	// Check if documents directory exists
	if _, err := os.Stat(docsPath); os.IsNotExist(err) {
		fmt.Printf("��️ Documents directory not found at %s. Please create it and add your .md or .txt files.\n", docsPath)
		os.MkdirAll(docsPath, os.ModePerm) // Create the directory to prevent future errors
		return
	}

	fmt.Println("📁 Loading documents...")
	docs, err := loadDocuments(docsPath)
	if err != nil {
		panic(err)
	}

	if len(docs) == 0 {
		fmt.Println("⚠️ No documents found in", docsPath, "- The index will be empty.")
	} else {
		fmt.Printf("✅ Loaded %d document(s).\n", len(docs))
	}

	// Remove old index if it exists
	if _, err := os.Stat(indexPath); err == nil {
		fmt.Println("📦 Removing existing index...")
		os.RemoveAll(indexPath)
	}

	fmt.Println("📦 Creating new index...")
	mapping := bleve.NewIndexMapping()
	index, err := bleve.New(indexPath, mapping)
	if err != nil {
		panic(err)
	}

	for filename, content := range docs {
		fmt.Printf("  -> Indexing %s\n", filename)
		index.Index(filename, map[string]string{"content": content})
	}

	index.Close()
	fmt.Println("✅ Index created successfully at", indexPath)
}
