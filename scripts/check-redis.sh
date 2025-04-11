#!/bin/bash

# check-redis.sh

# Check if Redis is running
RUNNING=$(docker ps --filter "name=redis" --filter "status=running" -q)

if [ ! -z "$RUNNING" ]; then
  echo "✅ Redis container is already running."
  exit 0
fi

# If we're here, Redis is not running, so let's check if it exists but is stopped
STOPPED=$(docker ps --filter "name=redis" --filter "status=exited" -q)

if [ ! -z "$STOPPED" ]; then
  echo "⚡ Starting existing Redis container..."
  docker start redis
  
  # Verify it started successfully
  sleep 1
  if docker ps --filter "name=redis" --filter "status=running" -q; then
    echo "✅ Redis container started successfully."
  else
    echo "❌ Failed to start Redis container."
    exit 1
  fi
else
  # No Redis container exists, so create a new one
  echo "🚀 Running a new Redis container..."
  docker run --name redis -d -p 6379:6379 redis
  
  # Verify it was created successfully
  if docker ps --filter "name=redis" --filter "status=running" -q; then
    echo "✅ New Redis container created and running."
  else
    echo "❌ Failed to create Redis container."
    exit 1
  fi
fi