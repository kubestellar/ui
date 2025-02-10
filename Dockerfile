# Stage 1: Build frontend
FROM node:18 AS frontend-builder

WORKDIR /app

# Copy package.json and package-lock.json first to optimize Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --legacy-peer-deps
RUN echo "VITE_BASE_URL=http://localhost:4000" > .env
# Copy the rest of the application code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS frontend


# Copy the build artifacts from the builder stage
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the container
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
