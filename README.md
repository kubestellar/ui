<p align="center">
  <img alt="KubeStellar Logo" width="250px" src="frontend/public/Kubestellar-logo.png" />
</p>

<h2 align="center">Multi-cluster Configuration Management for Edge, Multi-Cloud, and Hybrid Cloud</h2>

<p align="center">
  <strong>
    <a href="https://kubestellar.io/">Read more about KubeStellar</a>
  </strong>
</p>

> Check out the main [KubeStellar project](https://github.com/kubestellar/kubestellar)

# KubestellarUI Setup Guide

Welcome to **KubestellarUI**! This guide will help you set up the KubestellarUI application on your local machine after cloning the repository for development. The application consists of two main parts:

1. **Frontend**: Built with React and TypeScript
2. **Backend**: Built with Golang using the Gin framework.

<a href="https://cloud-native.slack.com/archives/C097094RZ3M"> 
  <img alt="Join Slack" src="https://img.shields.io/badge/KubeStellar-Join%20Slack-blue?logo=slack">
</a>
<a href="https://deepwiki.com/kubestellar/ui">
  <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki">
</a>

## Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
  - [Local Setup](#local-setup)
  - [Local Setup with Docker Compose](#local-setup-with-docker-compose)
- [Accessing the Application](#accessing-the-application)
- [Migration Commands](#migration-commands)

## Prerequisites

**Before you begin, ensure that your system meets the following requirements:**

### 1. Golang

- **Version**: 1.23.4
- **Download Link**: [Golang Downloads](https://golang.org/dl/)

### 2. Node.js and npm

- **Node.js Version**: ≥ 16.x.x
- **npm Version**: Comes bundled with Node.js
- **Download Link**: [Node.js Downloads](https://nodejs.org/en/download/)

> [!NOTE]
> You can use [nvm](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions.

### 3. Git

- Ensure Git is installed to clone the repository
- **Download Link**: [Git Downloads](https://git-scm.com/downloads)

### 4. Kubernetes Clusters

- Ensure you have access to a Kubernetes clusters setup with Kubestellar Getting Started Guide & Kubestellar prerequisites installed

- **Kubestellar guide**: [Guide](https://docs.kubestellar.io/release-0.25.1/direct/get-started/)

> [!NOTE]
> If you're running on macOS, you may need to manually add a host entry to resolve `its1.localtest.me` to `localhost` using:
>
> ```bash
> echo "127.0.0.1 its1.localtest.me" | sudo tee -a /etc/hosts
> ```

### 5. Make and Air

- Make sure you have "make" installed to directly execute the backend script via makefile
- Air helps in hot reloading of the backend
- **Air Installation Guide**: [Guide](https://github.com/air-verse/air#installation)

### 6. Golang Migrate

- Make sure you have installed 'golang-migrate' cli tool which helps in database migration
- **Golang-Migrate Installation Guide:** [Install](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate)

## Installation Steps

Clone the Repository

```bash
git clone https://github.com/kubestellar/ui.git

cd ui
```

Then go through one of the setup options below:

- [Local Setup](#local-setup)
- [Local Setup with Docker Compose](#local-setup-with-docker-compose)

### Local Setup

#### Step 1: Create `.env` File for Frontend Configuration

To configure the frontend, copy the `.env.example` file to a `.env` file in the `frontend/` directory (where `package.json` is located).

```bash
cd frontend/

cp .env.example .env
```

**Example `.env` file:**

```env
VITE_PROMETHEUS_URL=http://localhost:9090
VITE_BASE_URL=http://localhost:4000
VITE_APP_VERSION=0.1.0
VITE_GIT_COMMIT_HASH=$GIT_COMMIT_HASH
```

> [!NOTE]
> This is because `.env` files are intended to be a personal environment configuration file. The included `.env.example` in the repo is a standard that most other node projects include for the same purpose. You rename the file to `.env` and then change its contents to align with your system and personal needs.

##### Tracking Application Version and Git Commit Hash

KubestellarUI uses environment variables to track the app version and the current Git commit hash.

**Environment Variables**

| Variable               | Purpose                                 | Example                 |
| ---------------------- | --------------------------------------- | ----------------------- |
| `VITE_PROMETHEUS_URL`  | Defines the Prometheus URL              | `http://localhost:9090` |
| `VITE_BASE_URL`        | Defines the base URL for API calls      | `http://localhost:4000` |
| `VITE_APP_VERSION`     | Defines the current application version | `0.1.0`                 |
| `VITE_GIT_COMMIT_HASH` | Captures the current Git commit hash    | (Set during build)      |

#### Step 2: Run Redis Container (Optional)

KubestellarUI uses Redis for caching real-time WebSocket updates to prevent excessive Kubernetes API calls.

#### Step 3: Run PostgreSQL and Redis with Docker Compose

To run PostgreSQL and Redis services:

```bash
# Navigate to the backend directory
cd backend

# Start PostgreSQL and Redis services in detached mode
docker compose up -d

# Verify that services are running
docker ps
```

This will start:

- PostgreSQL on port 5432 (for persistent data storage)
- Redis on port 6379 (for caching WebSocket updates)

Both services are configured with appropriate volumes to persist data between restarts.

#### Step 3: Create `.env` File for Backend Configuration

To configure the backend, copy the `.env.example` file to a `.env` file in the `backend/` directory.

```bash
cd backend/

cp .env.example .env
```

**Example `.env` file:**

```env
REDIS_HOST=localhost
REDIS_PORT=6379
CORS_ALLOWED_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://authuser:authpass123@localhost:5400/authdb?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4000
GIN_MODE=debug
```

> [!NOTE]
> Make sure to update the values according to your local environment setup, especially the `DATABASE_URL` and `JWT_SECRET` for security reasons.

#### Step 4: Install and Run the Backend

Make sure you are in the root directory of the project

```bash
cd backend

go mod download

make migrate-up #for keeping our database in sync with changes in sql code of project(only use when you've added/updated migration files)

# run this only when DB got changes without migration
# it forces the migration version(in local) to match with DB state
make migrate-force

# Option 1 : Start backend with hot reloading (recommended)
make dev

# Option 2 : Start backend without hot reloading
go run main.go
```

You should see output indicating the server is running on port `4000`.

#### Step 5: Install and Run Frontend

Open another terminal and make sure you are in the root directory of the project.

```bash
cd frontend

npm install

npm run dev
```

You should see output indicating the server is running on port `5173`.

### Local Setup with Docker Compose

If you prefer to run the application using Docker Compose, follow these steps:

#### Step 1: Ensure Docker is Installed

- **Download Link**: [Docker Downloads](https://www.docker.com/products/docker-desktop)

> [!NOTE]
> If you are using Docker Desktop, please enable host networking. To do so navigate to Settings > Resources > Network, and check the "Enable host networking" option. Finally, apply the changes and restart Docker Desktop.

> [!NOTE]
> If you are using Compose V1, change the `docker compose` command to `docker-compose` in the following steps.
> Checkout [Migrating to Compose V2](https://docs.docker.com/compose/releases/migrate/) for more info.

#### Step 2: Environment Configuration (Optional)

Docker Compose is configured to use environment variables with sensible defaults. You can customize the configuration by:

**Option 1: Using a .env file** (Recommended for persistent configuration)

Create a `.env` file in the `frontend/` directory:

```bash
cd frontend/

cp .env.example .env
```

**Example `.env` file for Docker Compose:**

```bash
# Frontend Configuration
VITE_BASE_URL=http://localhost:4000
VITE_SKIP_PREREQUISITES_CHECK=true
VITE_APP_VERSION=0.1.0
NGINX_HOST=localhost
BACKEND_URL=http://localhost:4000
FRONTEND_PORT=5173

# Backend Configuration
BACKEND_PORT=4000
CORS_ALLOWED_ORIGIN=http://localhost:5173

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_IMAGE=ghcr.io/kubestellar/ui/redis:latest
REDIS_CONTAINER_NAME=kubestellar-redis

# Example configurations for different environments:
# For production:
# VITE_BASE_URL=https://api.yourapp.com
# NGINX_HOST=yourapp.com
# BACKEND_URL=https://api.yourapp.com
# FRONTEND_PORT=80

# For staging:
# VITE_BASE_URL=https://staging-api.yourapp.com
# NGINX_HOST=staging.yourapp.com
# BACKEND_URL=https://staging-api.yourapp.com
```

**Option 2: Using system environment variables**

Set environment variables in your shell:

```bash
export VITE_BASE_URL=https://api.myapp.com
export NGINX_HOST=myapp.com
export BACKEND_URL=https://api.myapp.com
export FRONTEND_PORT=8080
```

**Option 3: Inline environment variables**

```bash
VITE_BASE_URL=https://api.myapp.com NGINX_HOST=myapp.com docker compose up
```

> [!NOTE]
> All environment variables have default values, so the application will work without any configuration. The defaults are suitable for local development.

##### Available Environment Variables

**Frontend Variables:**

- `VITE_BASE_URL` - Base URL for API calls (default: `http://localhost:4000`)
- `VITE_SKIP_PREREQUISITES_CHECK` - Skip prerequisites check (default: `true`)
- `VITE_APP_VERSION` - Application version (default: `0.1.0`)
- `NGINX_HOST` - Nginx server name (default: `localhost`)
- `BACKEND_URL` - Backend URL for proxy (default: `http://localhost:4000`)
- `FRONTEND_PORT` - Frontend port mapping (default: `5173`)

**Backend Variables:**

- `BACKEND_PORT` - Backend port mapping (default: `4000`)
- `CORS_ALLOWED_ORIGIN` - CORS allowed origin (default: `http://localhost:5173`)
- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)

**Redis Variables:**

- `REDIS_IMAGE` - Redis Docker image (default: `ghcr.io/kubestellar/ui/redis:latest`)
- `REDIS_CONTAINER_NAME` - Redis container name (default: `kubestellar-redis`)

#### Step 3: Run Services

From the project root directory:

```bash
docker compose up --build
```

You should see output indicating the services are running.

To stop the application:

```bash
docker compose down
```

#### Step 4: Running with Custom Configuration

**With custom ports:**

```bash
FRONTEND_PORT=8080 BACKEND_PORT=3000 docker compose up
```

**With production-like settings:**

```bash
VITE_BASE_URL=https://api.production.com NGINX_HOST=production.com docker compose up
```

**Using a specific Redis image:**

```bash
REDIS_IMAGE=redis:7-alpine docker compose up
```

---

> [!NOTE]
> **For WSL Users 🐧**
>
> If you've successfully installed the KubeStellar but they are not detected by frontend, it might be due to a communication issue between Docker and WSL.
>
> Here are a few steps to resolve it:
>
> 1. Open Docker Desktop settings and ensure WSL integration is enabled for your distribution (e.g., Ubuntu).
> 2. If the issue persists, consider uninstalling Docker Desktop from Windows and instead install Docker **directly inside your WSL environment** (e.g., Ubuntu).
> 3. After installing Docker inside WSL, reinstall the KubeStellar. This setup typically resolves the detection issues. ✅

### Accessing the Application

1. **Backend API**: [http://localhost:4000](http://localhost:4000) (or custom port if `BACKEND_PORT` is set)
2. **Frontend UI**: [http://localhost:5173](http://localhost:5173) (or custom port if `FRONTEND_PORT` is set)

### Migration Commands

```bash
cd backend
make migrate-up #for keeping our database in sync with changes in sql code
make migrate-down #rollback to previous 1 migration version(1 by default) and can specify if needed more than 1
make create-migration #create new migration file
make migrate-force # Force set migration version (use if out of sync)
```

#### Dashboard Default Login Credentials

- **Username: admin**
- **Password: admin**

> [!NOTE]
> If you're encountering errors while setting up the Kubestellar UI, even after correctly following the guide, try pruning the Docker images and containers related to the KS core.  
> Rebuild them and perform a restart.
>
> This resolves almost 80% of issues caused by overridden changes during installation on existing systems.

## Getting in touch

There are several ways to communicate with us:

- Instantly get access to our documents and meeting invites at our [Join Us Page.](http://kubestellar.io/joinus)

- The [`#kubestellar-dev` channel](https://cloud-native.slack.com/archives/C097094RZ3M) in the [Cloud Native Slack Workspace](https://communityinviter.com/apps/cloud-native/cncf).

- Our mailing lists:
  - [kubestellar-dev](https://groups.google.com/g/kubestellar-dev) for development discussions.
  - [kubestellar-users](https://groups.google.com/g/kubestellar-users) for discussions among users and potential users.

- Subscribe to the [community meeting calendar](https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=MWM4a2loZDZrOWwzZWQzZ29xanZwa3NuMWdfMjAyMzA1MThUMTQwMDAwWiBiM2Q2NWM5MmJlZDdhOTg4NGVmN2ZlOWUzZjZjOGZlZDE2ZjZmYjJmODExZjU3NTBmNTQ3NTY3YTVkZDU4ZmVkQGc&tmsrc=b3d65c92bed7a9884ef7fe9e3f6c8fed16f6fb2f811f5750f547567a5dd58fed%40group.calendar.google.com&scp=ALL) for community meetings and events.
  - The [kubestellar-dev](https://groups.google.com/g/kubestellar-dev) mailing list is subscribed to this calendar.

- See recordings of past KubeStellar community meetings on [YouTube](https://www.youtube.com/@kubestellar)

- See [upcoming](https://github.com/kubestellar/kubestellar/issues?q=is%3Aissue+is%3Aopen+label%3Acommunity-meeting) and [past](https://github.com/kubestellar/kubestellar/issues?q=is%3Aissue+is%3Aclosed+label%3Acommunity-meeting) community meeting agendas and notes.

- Browse the [shared Google Drive](https://drive.google.com/drive/folders/1p68MwkX0sYdTvtup0DcnAEsnXElobFLS?usp=sharing) to share design docs, notes, etc.
  - Members of the [kubestellar-dev](https://groups.google.com/g/kubestellar-dev) mailing list can view this drive.

- Follow us on:
  - LinkedIn - [#kubestellar](https://www.linkedin.com/feed/hashtag/?keywords=kubestellar)
  - Medium - [kubestellar.medium.com](https://medium.com/@kubestellar/list/predefined:e785a0675051:READING_LIST)


<h2 align="left">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Red%20Heart.png" alt="Red Heart" width="40" height="40" />
  Contributors
</h2>

<p align="center">
  <a href="https://github.com/kubestellar/ui/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=kubestellar/ui" alt="Contributors" />
  </a>
</p>
