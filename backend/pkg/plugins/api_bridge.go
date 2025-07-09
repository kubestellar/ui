package plugins

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// APIBridge provides communication between plugins and external APIs
type APIBridge struct {
	client    *http.Client
	baseURL   string
	authToken string
}

// APIRequest represents a request to be made by a plugin
type APIRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    []byte            `json:"body,omitempty"`
	Timeout int               `json:"timeout,omitempty"` // in seconds
}

// APIResponse represents a response from an API call
type APIResponse struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers"`
	Body       []byte            `json:"body"`
	Error      string            `json:"error,omitempty"`
}

// NewAPIBridge creates a new API bridge instance
func NewAPIBridge(baseURL string, authToken string) *APIBridge {
	return &APIBridge{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL:   baseURL,
		authToken: authToken,
	}
}

// MakeRequest executes an HTTP request on behalf of a plugin
func (ab *APIBridge) MakeRequest(ctx context.Context, req *APIRequest) (*APIResponse, error) {
	// Set timeout if specified
	timeout := time.Duration(req.Timeout) * time.Second
	if timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, timeout)
		defer cancel()
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, req.Method, req.URL, bytes.NewReader(req.Body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	// Add default headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("User-Agent", "KubeStellar-Plugin/1.0")

	// Add authentication token if available
	if ab.authToken != "" {
		httpReq.Header.Set("Authorization", "Bearer "+ab.authToken)
	}

	// Add custom headers
	for key, value := range req.Headers {
		httpReq.Header.Set(key, value)
	}

	// Execute request
	resp, err := ab.client.Do(httpReq)
	if err != nil {
		return &APIResponse{
			StatusCode: 0,
			Error:      err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &APIResponse{
			StatusCode: resp.StatusCode,
			Error:      fmt.Sprintf("failed to read response body: %v", err),
		}, nil
	}

	// Convert headers
	headers := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	return &APIResponse{
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       body,
	}, nil
}

// MakeKubernetesRequest makes a request to the Kubernetes API
func (ab *APIBridge) MakeKubernetesRequest(ctx context.Context, method, path string, body []byte) (*APIResponse, error) {
	url := fmt.Sprintf("%s%s", ab.baseURL, path)
	
	req := &APIRequest{
		Method:  method,
		URL:     url,
		Body:    body,
		Timeout: 30,
		Headers: map[string]string{
			"Accept": "application/json",
		},
	}

	return ab.MakeRequest(ctx, req)
}

// MakeInternalRequest makes a request to internal KubeStellar APIs
func (ab *APIBridge) MakeInternalRequest(ctx context.Context, method, path string, body []byte) (*APIResponse, error) {
	url := fmt.Sprintf("http://localhost:4000%s", path)
	
	req := &APIRequest{
		Method:  method,
		URL:     url,
		Body:    body,
		Timeout: 10,
		Headers: map[string]string{
			"Accept": "application/json",
		},
	}

	return ab.MakeRequest(ctx, req)
}

// ValidateRequest validates an API request before execution
func (ab *APIBridge) ValidateRequest(req *APIRequest) error {
	if req.Method == "" {
		return fmt.Errorf("method is required")
	}
	if req.URL == "" {
		return fmt.Errorf("URL is required")
	}

	// Validate method
	validMethods := map[string]bool{
		"GET":     true,
		"POST":    true,
		"PUT":     true,
		"PATCH":   true,
		"DELETE":  true,
		"HEAD":    true,
		"OPTIONS": true,
	}
	if !validMethods[req.Method] {
		return fmt.Errorf("invalid HTTP method: %s", req.Method)
	}

	// Validate timeout
	if req.Timeout < 0 {
		return fmt.Errorf("timeout cannot be negative")
	}
	if req.Timeout > 300 { // Max 5 minutes
		return fmt.Errorf("timeout cannot exceed 300 seconds")
	}

	return nil
}

// SerializeRequest serializes an API request to JSON
func (ab *APIBridge) SerializeRequest(req *APIRequest) ([]byte, error) {
	return json.Marshal(req)
}

// DeserializeRequest deserializes an API request from JSON
func (ab *APIBridge) DeserializeRequest(data []byte) (*APIRequest, error) {
	var req APIRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return nil, err
	}
	return &req, nil
}

// SerializeResponse serializes an API response to JSON
func (ab *APIBridge) SerializeResponse(resp *APIResponse) ([]byte, error) {
	return json.Marshal(resp)
}

// DeserializeResponse deserializes an API response from JSON
func (ab *APIBridge) DeserializeResponse(data []byte) (*APIResponse, error) {
	var resp APIResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
} 