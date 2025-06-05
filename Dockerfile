# Stage 1: Build frontend
FROM ghcr.io/kubestellar/ui/node:18 AS frontend-builder

# Set working directory
WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git

# Copy package files for caching
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Explicitly copy .git to access commit hash
COPY .git .git

# Extract Git commit hash
RUN git rev-parse HEAD > commit_hash.txt

# Accept build arguments
ARG VITE_APP_VERSION=0.1.0
ARG VITE_SKIP_PREREQUISITES_CHECK=true
ARG VITE_BASE_URL

# Set environment variables from build args
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_SKIP_PREREQUISITES_CHECK=$VITE_SKIP_PREREQUISITES_CHECK
ENV VITE_BASE_URL=$VITE_BASE_URL

# Build frontend
RUN npm run build

# Store commit hash inside the build output
RUN mv commit_hash.txt dist/

# Stage 2: Serve with Nginx
FROM ghcr.io/kubestellar/nginx:alpine AS frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]