# Frontend Dockerfile
FROM node:20-alpine AS frontend

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the source code
COPY . .

# Expose the Vite development server port
EXPOSE 5173

# Start the development server with hot-reloading
CMD ["npm", "run", "dev"]

