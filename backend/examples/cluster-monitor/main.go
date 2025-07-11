//go:build wasm

package main

//export handle_status
func handle_status(inputPtr, inputLen uint64) uint64 {
	// Return 0 to indicate no data - backend will handle this gracefully
	return 0
}

//export handle_data
func handle_data(inputPtr, inputLen uint64) uint64 {
	// Return 0 to indicate no data - backend will handle this gracefully
	return 0
}

//export allocate
func allocate(size uint32) uint32 {
	// Return fixed memory address
	return 0x1000
}

//export deallocate
func deallocate(ptr uint32, size uint32) {
	// No-op for now
}

func main() {
	// Required but not used in WASM
}
