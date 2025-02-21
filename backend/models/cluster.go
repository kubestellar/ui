package models

type ClusterStatus struct {
	ClusterName string `json:"clusterName"`
	Status      string `json:"status"`
}

type Cluster struct {
	Name   string   `json:"clusterName"`
	Region string   `json:"Region"`
	Value  []string `json:"value"`
	Node   string   `json:"node"`
}
