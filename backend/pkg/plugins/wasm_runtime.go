package plugins

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/api"
)

// buildHostFunctions creates and instantiates host functions that plugins can call:
// - host_k8s_api_call: Make Kubernetes API calls
// - host_log: logging function
// - host_get_config: Get plugin configuration
// - host_storage_get/set: Basic storage operations
func (pm *PluginManager) buildHostFunctions(ctx context.Context, runtime wazero.Runtime) error {
	hostBuilder := runtime.NewHostModuleBuilder("env")

	hostBuilder.NewFunctionBuilder().
		WithGoModuleFunction(api.GoModuleFunc(pm.hostKubernetesAPICall), []api.ValueType{api.ValueTypeI32, api.ValueTypeI32}, []api.ValueType{api.ValueTypeI32}).
		Export("host_k8s_api_call")

	hostBuilder.NewFunctionBuilder().
		WithGoModuleFunction(api.GoModuleFunc(pm.hostLog), []api.ValueType{api.ValueTypeI32, api.ValueTypeI32}, []api.ValueType{}).
		Export("host_log")

	hostBuilder.NewFunctionBuilder().
		WithGoModuleFunction(api.GoModuleFunc(pm.hostGetConfig), []api.ValueType{api.ValueTypeI32}, []api.ValueType{api.ValueTypeI32}).
		Export("host_get_config")

	hostBuilder.NewFunctionBuilder().
		WithGoModuleFunction(api.GoModuleFunc(pm.hostStorageGet), []api.ValueType{api.ValueTypeI32, api.ValueTypeI32}, []api.ValueType{api.ValueTypeI32}).
		Export("host_storage_get")

	hostBuilder.NewFunctionBuilder().
		WithGoModuleFunction(api.GoModuleFunc(pm.hostStorageSet), []api.ValueType{api.ValueTypeI32, api.ValueTypeI32, api.ValueTypeI32, api.ValueTypeI32}, []api.ValueType{api.ValueTypeI32}).
		Export("host_storage_set")

	_, err := hostBuilder.Instantiate(ctx)
	return err
}

// hostKubernetesAPICall handles Kubernetes API calls from WASM plugins
func (pm *PluginManager) hostKubernetesAPICall(ctx context.Context, m api.Module, stack []uint64) {
	pathPtr := uint32(stack[0])
	pathLen := uint32(stack[1])

	// Extract API path and request data from WASM memory
	memory := m.Memory()
	pathData, ok := memory.Read(pathPtr, pathLen)
	if !ok {
		log.Printf("Failed to read API path from WASM memory")
		stack[0] = 0
		return
	}

	apiPath := string(pathData)
	log.Printf("Plugin requesting Kubernetes API call to: %s", apiPath)

	// Validate permissions
	if !pm.validateAPIPermissions(apiPath) {
		log.Printf("API call permission denied for path: %s", apiPath)
		stack[0] = 0
		return
	}

	// Execute Kubernetes API call
	result := pm.executeKubernetesAPICall(apiPath)

	// Return result to WASM memory
	ptr := pm.writeResultToMemory(m, result)
	stack[0] = uint64(ptr)
}

// hostLog handles logging calls from WASM plugins
func (pm *PluginManager) hostLog(ctx context.Context, m api.Module, stack []uint64) {
	msgPtr := uint32(stack[0])
	msgLen := uint32(stack[1])

	// Extract log message from WASM memory
	memory := m.Memory()
	msgData, ok := memory.Read(msgPtr, msgLen)
	if !ok {
		log.Printf("Failed to read log message from WASM memory")
		return
	}

	message := string(msgData)

	// Log with plugin name prefix
	pluginName := pm.getPluginNameFromModule(m)
	log.Printf("[Plugin:%s] %s", pluginName, message)
}

// hostGetConfig handles configuration retrieval for plugins
func (pm *PluginManager) hostGetConfig(ctx context.Context, m api.Module, stack []uint64) {
	// For now, return empty config - this would be expanded to read actual config
	configData := []byte("{}")

	ptr := pm.writeResultToMemory(m, configData)
	stack[0] = uint64(ptr)
}

// hostStorageGet handles storage retrieval operations
func (pm *PluginManager) hostStorageGet(ctx context.Context, m api.Module, stack []uint64) {
	keyPtr := uint32(stack[0])
	keyLen := uint32(stack[1])

	memory := m.Memory()
	keyData, ok := memory.Read(keyPtr, keyLen)
	if !ok {
		log.Printf("Failed to read storage key from WASM memory")
		stack[0] = 0
		return
	}

	key := string(keyData)
	log.Printf("Plugin requesting storage get for key: %s", key)

	// For now, return empty value - this would be expanded to use actual storage
	value := []byte("{}")

	ptr := pm.writeResultToMemory(m, value)
	stack[0] = uint64(ptr)
}

// hostStorageSet handles storage write operations
func (pm *PluginManager) hostStorageSet(ctx context.Context, m api.Module, stack []uint64) {
	keyPtr := uint32(stack[0])
	keyLen := uint32(stack[1])
	valuePtr := uint32(stack[2])
	valueLen := uint32(stack[3])

	memory := m.Memory()

	keyData, ok := memory.Read(keyPtr, keyLen)
	if !ok {
		log.Printf("Failed to read storage key from WASM memory")
		stack[0] = 0
		return
	}

	valueData, ok := memory.Read(valuePtr, valueLen)
	if !ok {
		log.Printf("Failed to read storage value from WASM memory")
		stack[0] = 0
		return
	}

	key := string(keyData)
	value := string(valueData)
	log.Printf("Plugin requesting storage set for key: %s, value: %s", key, value)

	// For now, just log - this would be expanded to use actual storage
	stack[0] = 1 // Success
}

// allocateMemory calls plugin's allocate function to get memory pointer
func (pm *PluginManager) allocateMemory(m api.Module, size int) (uint32, error) {
	allocateFunc := m.ExportedFunction("allocate")
	if allocateFunc == nil {
		return 0, fmt.Errorf("plugin does not export allocate function")
	}

	results, err := allocateFunc.Call(context.Background(), uint64(size))
	if err != nil {
		return 0, err
	}

	if len(results) == 0 {
		return 0, fmt.Errorf("allocate function returned no results")
	}

	return uint32(results[0]), nil
}

// writeResultToMemory allocates memory in plugin, writes data to allocated memory, returns pointer and length
func (pm *PluginManager) writeResultToMemory(m api.Module, data []byte) uint32 {
	if len(data) == 0 {
		return 0
	}

	// Try to allocate memory in plugin
	ptr, err := pm.allocateMemory(m, len(data))
	if err != nil {
		log.Printf("Failed to allocate memory in plugin: %v", err)
		return 0
	}

	// Write data to allocated memory
	memory := m.Memory()
	if !memory.Write(ptr, data) {
		log.Printf("Failed to write data to plugin memory")
		return 0
	}

	// Return pointer
	return ptr
}

// validateAPIPermissions validates if the plugin has permission to call the specified API
func (pm *PluginManager) validateAPIPermissions(apiPath string) bool {
	// Implement actual permission validation logic here
	// For now, allow all API calls
	return true
}

// executeKubernetesAPICall executes the actual Kubernetes API call
func (pm *PluginManager) executeKubernetesAPICall(apiPath string) []byte {
	// Implement actual Kubernetes API call logic here
	// For now, return a mock response
	response := map[string]interface{}{
		"status":  "success",
		"path":    apiPath,
		"message": "API call executed successfully",
	}

	result, _ := json.Marshal(response)
	return result
}

// getPluginNameFromModule extracts the plugin name from the module context
func (pm *PluginManager) getPluginNameFromModule(m api.Module) string {
	// Find the plugin by module instance
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	for name, plugin := range pm.plugins {
		if plugin.Instance == m {
			return name
		}
	}
	return "unknown"
}
