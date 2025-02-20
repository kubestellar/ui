package models

type ClusterStatus struct {
	ClusterName string `json:"clusterName"`
	Status      string `json:"status"`
}

type Cluster struct {
	Name       string `json:"clusterName"`
	ClusterSet string `json:"clusterSet"`
	ImportMode string `json:"importMode"`
}
