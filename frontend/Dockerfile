# Stage 1: Build frontend
FROM node:20 AS frontend-builder

# Set working directory
WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git

# Copy package files for caching
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .


# Get commit hash or use a default value
RUN if [ -d .git ]; then \
      git rev-parse HEAD > commit_hash.txt; \
    elif [ -f commit_hash.txt ]; then \
      echo "Using existing commit_hash.txt"; \
    else \
      echo "no-git-version" > commit_hash.txt; \
    fi


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
FROM nginx:alpine AS frontend

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy build output
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy nginx template (make sure this file exists in your project root)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Create startup script
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst "\$NGINX_HOST \$BACKEND_URL" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'exec "$@"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
