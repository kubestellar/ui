.PHONY: all start stop backend frontend

# File to store process IDs
PID_FILE=processes.pid

# Start both backend and frontend
start: start-backend start-frontend

start-backend:
	cd backend && go run ./main.go & echo $$! >> $(PID_FILE)

start-frontend:
	npm install
	npm install vite@5.4.11
	npm run dev & echo $$! >> $(PID_FILE)

# Stop all processes
stop:
	@if [ -f $(PID_FILE) ]; then \
		echo "Stopping processes..."; \
		xargs kill < $(PID_FILE) && rm -f $(PID_FILE); \
		echo "Processes stopped."; \
	else \
		echo "No processes to stop."; \
	fi

# Combined target to run backend and frontend
all: start

