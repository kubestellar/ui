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
git clone https://github.com/your-github-username/ui.git

cd ui
```

### 2. Create `.env` File for Frontend Configuration

To configure the frontend, rename the `example.env` file to `.env` in the project root directory (where `package.json` is located).  

**Example `.env` file:**  

```
VITE_BASE_URL=http://localhost:4000
VITE_APP_VERSION=0.1.0
VITE_GIT_COMMIT_HASH=$GIT_COMMIT_HASH
```

This is because `.env` files are intended to be a personal environment configuration file. The included `example.env` in the repo is a standard that most other node projects include for the same purpose. You rename the file to `.env` and then change its contents to align with your system and personal needs.

#### Tracking Application Version and Git Commit Hash

KubestellarUI uses environment variables to track the app version and the current Git commit hash.  

#### **Environment Variables**  

| Variable               | Purpose                                 | Example |
|------------------------|-----------------------------------------|---------|
| `VITE_BASE_URL`        | Defines the base URL for API calls     | `http://localhost:4000` |
| `VITE_APP_VERSION`     | Defines the current application version | `0.1.0` |
| `VITE_GIT_COMMIT_HASH` | Captures the current Git commit hash   | (Set during build) |

---

####  Run Redis Container**  

KubestellarUI uses Redis for caching real-time WebSocket updates to prevent excessive Kubernetes API calls.  

Run Redis using Docker:  

```bash
docker run --name redis -d -p 6379:6379 redis
```

Verify Redis is running:  

```bash
docker ps | grep redis
```

---


###  Install and Run Backend

```bash
cd backend

go mod download

go run main.go
```

The backend server will start on port 4000. You should see output indicating the server is running.

###  Install and Run Frontend

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

###  Run with Docker Compose

If you prefer to run the application using Docker Compose, follow these steps:

#### 1. Ensure Docker is Installed

- **Download Link**: [Docker Downloads](https://www.docker.com/products/docker-desktop)

#### 2. Run Docker Compose

From the project root directory:

```bash
docker-compose up --build
```

To stop the application:

```bash
docker-compose down
```

#### 3. Use Docker Compose in Development Cycle

For ongoing development, use the following steps:

- **Quit the Application**:
  ```bash
  docker-compose down
  ```

- **Pull the Latest Changes**:
  ```bash
  git pull origin main
  ```

- **Restart the Application**:
  ```bash
  docker-compose up --build
  ```

This will:

- Stop the running containers.
- Pull the latest source code changes.
- Rebuild and restart the application.

## Docker Image Versioning and Pulling

If you'd like to work with the Docker images for the **KubestellarUI** project, here's how you can use the `latest` and versioned tags:

1. **Frontend Image**:
   - Tag: `quay.io/kubestellar/ui:frontend`
   - Latest Version: `latest`
   - Specific Version (Commit Hash): `frontend-<commit-hash>`

2. **Backend Image**:
   - Tag: `quay.io/kubestellar/ui:backend`
   - Latest Version: `latest`
   - Specific Version (Commit Hash): `backend-<commit-hash>`

### How to Pull the Latest Images:

- **Frontend Image**:
  ```bash
  docker pull quay.io/kubestellar/ui:frontend
  ```

- **Backend Image**:
  ```bash
  docker pull quay.io/kubestellar/ui:backend
  ```

### How to Pull Specific Version (Commit Hash):

If you want to pull an image for a specific version (e.g., commit hash), use:

- **Frontend Image with Version**:
  ```bash
  docker pull quay.io/kubestellar/ui:frontend-abcd1234
  ```

- **Backend Image with Version**:
  ```bash
  docker pull quay.io/kubestellar/ui:backend-abcd1234
  ```


## Accessing the Application

1. **Backend API**: [http://localhost:4000](http://localhost:4000)
2. **Frontend UI**: [http://localhost:5173](http://localhost:5173)


<div>
<h2><font size="6"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png" alt="Red Heart" width="40" height="40" /> Contributors </font></h2>
</div>
<br>

<center>
<a href="https://github.com/kubestellar/ui/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=kubestellar/ui" />
</a>
</center>
<br>
