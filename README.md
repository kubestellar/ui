
# KubestellarUI Setup Guide

Welcome to **KubestellarUI**! This guide will help you set up the KubestellarUI application on your local machine after cloning the repository for development. The application consists of two main parts:
1. **Frontend**: Built with React and TypeScript
2. **Backend**: Built with Golang using the Gin framework.

## Prerequisites

Before you begin, ensure that your system meets the following requirements:

### 1. Golang
- **Version**: 1.23.4
- **Download Link**: [Golang Downloads](https://golang.org/dl/)

### 2. Node.js and npm
- **Node.js Version**: ≥ 16.x.x
- **npm Version**: Comes bundled with Node.js
- **Download Link**: [Node.js Downloads](https://nodejs.org/en/download/)

### 3. Git
- Ensure Git is installed to clone the repository
- **Download Link**: [Git Downloads](https://git-scm.com/downloads)

### 4. Kubernetes Clusters
- Ensure you have access to a Kubernetes clusters setup with Kubestellar Getting Started Guide & Kubestellar prerequisites installed
- **Kubestellar guide**: [Guide](https://docs.kubestellar.io/release-0.25.1/direct/get-started/)

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/katamyra/kubestellarUI.git

cd kubestellarUI
```

### 2. Create `.env` File for Frontend Configuration

To simplify managing different environment variables, create a `.env` file in the project root directory (where `package.json` is located).

**Example `.env` file**:

```
VITE_BASE_URL=http://localhost:4000
```

### 3. Install and Run Backend

```bash
cd backend

go mod download

go run main.go
```

The backend server will start on port 4000. You should see output indicating the server is running.

### 4. Install and Run Frontend

#### Install Dependencies

From the project root directory:
```bash
npm install
```

#### Run Development Server
```bash
npm run dev
```
The frontend development server will start, typically on port 5173.

## Accessing the Application

1. Backend API: [http://localhost:4000](http://localhost:4000)
2. Frontend UI: [http://localhost:5173](http://localhost:5173)