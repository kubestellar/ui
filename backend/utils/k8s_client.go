package utils

import (
	"k8s.io/client-go/rest"
)

// ConfigureTLSInsecure modifies a REST config to skip TLS certificate verification.
// This should only be used in development environments.
func ConfigureTLSInsecure(config *rest.Config) *rest.Config {
	// Skip TLS verification to fix certificate errors
	config.TLSClientConfig.Insecure = true
	config.TLSClientConfig.CAData = nil
	config.TLSClientConfig.CAFile = ""
	return config
} 