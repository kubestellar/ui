# Makefile
build:
	tinygo build -o cluster-monitor.wasm -target wasm main.go

package:
	tar -czf plugin.tar.gz plugin.yml cluster-monitor.wasm frontend/ 