//go:build wasm

package main

import (
	"encoding/json"
	"unsafe"
)

// Simple memory allocator
var memoryBase uint32 = 0x1000
var memoryOffset uint32 = 0

//export handle_status
func handle_status(inputPtr, inputLen uint64) uint64 {

	response := `{"status":"healthy"}`

	return allocateAndReturn(response)
}

//export handle_data
func handle_data(inputPtr, inputLen uint64) uint64 {

	response := `{"data":"cluster-monitor-data"}`

	return allocateAndReturn(response)
}

//export read_data
func read_data(inputPtr, inputLen uint64) uint64 {
	// Read input from memory
	ptr := uintptr(inputPtr)
	len := int(inputLen)
	input := unsafe.Slice((*byte)(unsafe.Pointer(ptr)), len)

	var response string

	//parse input as JSON
	var jsonInput any
	if err := json.Unmarshal(input, &jsonInput); err == nil {
		responseBytes, _ := json.Marshal(map[string]any{"data": jsonInput})
		response = string(responseBytes)
	}

	return allocateAndReturn(response)
}

// it returns wasm module data to host
func allocateAndReturn(data string) uint64 {
	//
	dataBytes := []byte(data)
	size := uint32(len(dataBytes))

	ptr := allocate(size)

	//copy data to memory
	dest := (*[1024]byte)(unsafe.Pointer(uintptr(ptr)))
	copy(dest[:size], dataBytes)

	// combined value: upper 32 bits = pointer, lower 32 bits = length
	return uint64(ptr)<<32 | uint64(size)
}

//export allocate
func allocate(size uint32) uint32 {
	ptr := memoryBase + memoryOffset
	memoryOffset += size
	return ptr
}

//export deallocate
func deallocate(ptr uint32, size uint32) {
	// No-op for now
}

func main() {
	// Required but not used in WASM
}
