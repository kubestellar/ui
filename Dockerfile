# Stage 1: Build
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copy the entire project
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve the built app
FROM nginx:stable-alpine

# Copy the build output to the Nginx server
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (optional)
# For example: adjust CORS or proxy settings
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5173

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
