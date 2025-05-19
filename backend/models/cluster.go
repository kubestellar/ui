package models

import "time"

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

type OnboardingEvent struct {
	ClusterName string    `json:"clusterName"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
}

// OnboardingResponse represents the response from the onboarding endpoint
type OnboardingResponse struct {
	Message           string `json:"message"`
	Status            string `json:"status"`
	LogsEndpoint      string `json:"logsEndpoint"`
	WebsocketEndpoint string `json:"websocketEndpoint"`
}

// OnboardingLogsResponse represents the response from the logs endpoint
type OnboardingLogsResponse struct {
	ClusterName string            `json:"clusterName"`
	Status      string            `json:"status"`
	Logs        []OnboardingEvent `json:"logs"`
	Count       int               `json:"count"`
}

// StatusResponse represents the response from the status endpoint
type StatusResponse struct {
	ClusterName string `json:"clusterName"`
	Status      string `json:"status"`
}

// Constants for status values
const (
	StatusPending   = "Pending"
	StatusOnboarded = "Onboarded"
	StatusFailed    = "Failed"

	// Detailed statuses for the onboarding process
	StatusInitiated  = "Initiated"
	StatusValidating = "Validating"
	StatusValidated  = "Validated"
	StatusConnecting = "Connecting"
	StatusConnected  = "Connected"
	StatusPreparing  = "Preparing"
	StatusPrepared   = "Prepared"
	StatusRetrieving = "Retrieving"
	StatusRetrieved  = "Retrieved"
	StatusJoining    = "Joining"
	StatusJoined     = "Joined"
	StatusWaiting    = "Waiting"
	StatusApproved   = "Approved"
	StatusCreated    = "Created"
	StatusLabeling   = "Labeling"
	StatusLabeled    = "Labeled"
	StatusSuccess    = "Success"
	StatusError      = "Error"
)
