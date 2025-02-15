package models

type Namespace struct {
	Name        string            `json:"name"`
	Status      string            `json:"status,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
	Pods        []string          `json:"pods,omitempty"`
	Deployments []string          `json:"deployments,omitempty"`
	Services    []string          `json:"services,omitempty"`
}
