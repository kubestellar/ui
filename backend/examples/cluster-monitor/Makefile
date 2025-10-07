# Makefile
.PHONY: build package

build:
	tinygo build -o cluster-monitor.wasm -target wasi main.go

package:
	tar -czf plugin.tar.gz plugin.yml cluster-monitor.wasm frontend/dist/ 