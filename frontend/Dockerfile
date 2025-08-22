# Stage 1: Build frontend
FROM node:20 AS frontend-builder

# Set working directory
WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git

# Copy git directory
COPY .git .git

# Get git commit hash
RUN git rev-parse HEAD | cut -c1-7 > commit_hash.txt 2>/dev/null || echo "unknown" > commit_hash.txt

# Copy package files for caching
COPY frontend/package.json frontend/package-lock.json ./
RUN rm -rf node_modules package-lock.json || true
RUN npm install --legacy-peer-deps

# Accept build arguments
ARG VITE_APP_VERSION=0.1.0
ARG VITE_SKIP_PREREQUISITES_CHECK=true
ARG VITE_BASE_URL

# Copy frontend source code
COPY frontend/ .

# Set environment variables from build args
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_SKIP_PREREQUISITES_CHECK=$VITE_SKIP_PREREQUISITES_CHECK
ENV VITE_BASE_URL=$VITE_BASE_URL

# Build frontend
RUN npm run build

# Store commit hash inside the build output
RUN mv commit_hash.txt dist/

# Stage 2: Serve with Nginx
# Stage 2: Serve with Nginx
FROM nginx:alpine AS frontend

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy build output
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx template (make sure this file exists in your project root)
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Create startup script that respects mounted configs
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo '# Set default envs if not passed' >> /docker-entrypoint.sh && \
    echo 'export BACKEND_URL=${BACKEND_URL:-backend:4000}' >> /docker-entrypoint.sh && \
    echo 'export NGINX_HOST=${NGINX_HOST:-localhost}' >> /docker-entrypoint.sh && \
    echo '# Check if config is already mounted (from ConfigMap)' >> /docker-entrypoint.sh && \
    echo 'if [ ! -f /etc/nginx/conf.d/default.conf ] || [ ! -s /etc/nginx/conf.d/default.conf ]; then' >> /docker-entrypoint.sh && \
    echo '  echo "Generating nginx config from template..."' >> /docker-entrypoint.sh && \
    echo '  envsubst "\$NGINX_HOST \$BACKEND_URL" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'else' >> /docker-entrypoint.sh && \
    echo '  echo "Using existing nginx config (from ConfigMap)"' >> /docker-entrypoint.sh && \
    echo 'fi' >> /docker-entrypoint.sh && \
    echo 'exec "$@"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
