package main

import (
	"github.com/blevesearch/bleve/v2"
)

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
