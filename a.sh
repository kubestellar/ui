#!/bin/bash

echo "========== go.mod =========="
find . -name go.mod -exec echo "---- {} ----" \; -exec cat {} \;


echo -e "\n========== Imports in backend/main.go =========="
grep '^import' ./backend/main.go -A 20 | sed '/)/q'

echo -e "\n========== Imports in backend/routes/plugins.go =========="
grep '^import' ./backend/routes/plugins.go -A 20 | sed '/)/q'

echo -e "\n========== Dockerfile =========="
cat ./backend/Dockerfile

echo -e "\n========== docker-compose.yml =========="
cat docker-compose.yml 2>/dev/null || echo "No docker-compose.yml found"

echo -e "\n========== Current Directory =========="
pwd
