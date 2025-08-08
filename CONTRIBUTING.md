# **Contributing to Kubestellar UI**

This guide will help you set up **PostgreSQL and Redis containers**, configure **JWT authentication**, test the authentication flow using different tools, and log into Kubestellar UI.

---

## **Contents**

- [Prerequisites](#prerequisites)
- [Setup PostgreSQL and Redis with Docker Compose](#setup-postgresql-and-redis-with-docker-compose)
- [Alternative: Setup Individual Containers](#alternative-setup-individual-containers)
- [Verify Services are Running](#verify-services-are-running)
- [Setting Up JWT Authentication](#setting-up-jwt-authentication)
- [Set Up Environment Variables](#set-up-environment-variables)
- [Export Environment Variables](#export-environment-variables-linuxmac)
- [Running the Go Backend](#running-the-go-backend)
- [Testing JWT Authentication](#testing-jwt-authentication)
- [Stopping and Removing Containers](#stopping-and-removing-containers)
- [Login to Kubestellar UI](#login-to-kubestellar-ui)
- [Docker Compose Development Cycle](#docker-compose-development-cycle)
- [Docker Image Versioning and Pulling](#docker-image-versioning-and-pulling)
- [Installing GolangCI-Lint](#installing-golangci-lint)
- [Linting & Fixing Code](#linting--fixing-code)
- [Imp Note](#important-note)
- [Contribution Commands Guide](#contribution-commands-guide)

---

## **Prerequisites**

Before proceeding, ensure you have the following installed:

- **Docker** (For running PostgreSQL and Redis containers)
- **PostgreSQL** (Optional - if not using Docker)
- **Redis** (Optional - if not using Docker)
- **Postman or cURL** (For API testing)
- **Go** (For running the backend)
- **OpenSSL** (For generating JWT secrets securely)
- **Make** (For running backend scripts via makefile)
- **Air** (For hot reloading - optional but recommended)

> [!NOTE]
> **Recommended Setup**: Use Docker Compose for the easiest setup experience. This automatically handles PostgreSQL and Redis containers with proper configuration.

---

## **Setup PostgreSQL and Redis with Docker Compose**

**Recommended approach for the best contributor experience**

Navigate to the backend directory and start PostgreSQL and Redis services:

```bash
# Navigate to the backend directory
cd backend

# Start PostgreSQL and Redis services in detached mode
docker compose up -d

# Verify that services are running
docker ps
```

This will start:

- **PostgreSQL** on port **5432** (for persistent data storage)
- **Redis** on port **6379** (for caching WebSocket updates)

Both services are configured with appropriate volumes to persist data between restarts.

---

## **Setting Up JWT Authentication**

### **Generate a JWT Secret Key**

There are multiple ways to generate a secure JWT secret key.

#### **(1) Using OpenSSL**

```bash
openssl rand -base64 32
```

This generates a **random 32-byte** secret key.

#### **(2) Using a Python One-Liner**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### **(3) Manually Define in a `.env` File**

```ini
JWT_SECRET=mysecurekeygeneratedhere
```

---

## **Set Up Environment Variables**

Create a **`.env`** file in the **`/backend`** directory (where `main.go` is located):

```ini
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kubestellar
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret Key (Replace with your generated key)
JWT_SECRET=mysecurekeygeneratedhere
```

---

## **Export Environment Variables (Linux/Mac)**

If you prefer not to use a `.env` file, you can export variables manually in your terminal:

```bash
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=kubestellar
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=mysecurekeygeneratedhere
```

---

## **Running the Go Backend**

Ensure you have Go installed, then run:

```bash
# Navigate to backend directory
cd backend

# Download dependencies
go mod download

# Option 1: Start backend with hot reloading (recommended)
make dev

# Option 2: Start backend without hot reloading
go run main.go
```

**Your API is now running on port 4000!**

> [!TIP]
> The `make dev` command uses Air for hot reloading, which automatically restarts the server when you make code changes.

---

## **Testing JWT Authentication**

You can either generate your JWT Token with **Postman** or **cURL:**

### **With Postman**

### **Step 1: Login and Get JWT Token**

#### **Request:**

- **Method:** `POST`
- **Endpoint:** `http://localhost:4000/login`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body:**
  ```json
  {
    "username": "admin",
    "password": "admin"
  }
  ```

#### **Response:**

```json
{
  "token": "your_generated_jwt_token"
}
```

---

### **Step 2: Access Protected Route**

#### **Request:**

- **Method:** `GET`
- **Endpoint:** `http://localhost:4000/protected`
- **Headers:**
  ```
  Authorization: Bearer <your_generated_jwt_token>
  ```

#### **Response (Valid Token):**

```json
{
  "message": "Welcome to the protected route!",
  "user": "admin"
}
```

#### **Response (Missing Token):**

```json
{
  "error": "Missing token"
}
```

#### **Response (Invalid Token):**

```json
{
  "error": "Invalid token"
}
```

---

### **Step 3: Testing with Postman**

1. **Login and Get a Token**
   - Open **Postman** and make a `POST` request to `http://localhost:4000/login`
   - Add the JSON payload:
     ```json
     {
       "username": "admin",
       "password": "admin"
     }
     ```
   - Click **Send**, and copy the `token` from the response.

2. **Access Protected Route**
   - Make a `GET` request to `http://localhost:4000/protected`
   - Go to the **Headers** section and add:
     ```
     Authorization: Bearer <your_token>
     ```
   - Click **Send** and verify the response.

---

### **With cURL**

If you prefer using the terminal, you can use `cURL`:

### **Login**

```bash
curl -X POST http://localhost:4000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
```

### **Access Protected Route**

```bash
curl -X GET http://localhost:4000/protected \
  -H "Authorization: Bearer <your_token>"
```

---

## **Stopping and Removing Containers**

### **If using Docker Compose:**

```bash
# Stop and remove containers
docker compose down

# To also remove volumes (this will delete all data)
docker compose down -v
```

### **If using individual containers:**

**Stop the containers:**

```bash
docker stop postgres redis
```

**Remove the containers:**

```bash
docker rm postgres redis
```

**Remove volumes (optional - this will delete all data):**

```bash
docker volume rm postgres_data
```

---

## **Login to Kubestellar UI**

Run the Frontend if you haven't already:

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Start development server
npm run dev
```

Login with these credentials:

- **Username:** `admin`
- **Password:** `admin`

> [!NOTE]
> You can input any word or strings of letters and numbers. Just as long as you have the username **admin**.

---

## **Docker Compose Development Cycle**

For ongoing development with Docker Compose, follow these steps:

### **Step 1: Stop the running Application**

```bash
docker compose down
```

### **Step 2: Pull the Latest Source Code Changes**

```bash
git pull origin main
```

### **Step 3: Rebuild and Restart the Application**

```bash
docker compose up --build
```

This will:

- Stop the running containers.
- Pull the latest source code changes.
- Rebuild and restart the application.

---

## **Docker Image Versioning and Pulling**

If you'd like to work with the Docker images for the **KubestellarUI** project, here's how you can use the `latest` and versioned tags:

### **Available Images**

1. **Frontend Image**:
   - Tag: `quay.io/kubestellar/ui:frontend`
   - Latest Version: `latest`
   - Specific Version (Commit Hash): `frontend-<commit-hash>`

2. **Backend Image**:
   - Tag: `quay.io/kubestellar/ui:backend`
   - Latest Version: `latest`
   - Specific Version (Commit Hash): `backend-<commit-hash>`

### **How to Pull the Latest Images**

- **Frontend Image**:

  ```bash
  docker pull quay.io/kubestellar/ui:frontend
  ```

- **Backend Image**:
  ```bash
  docker pull quay.io/kubestellar/ui:backend
  ```

### **How to Pull Specific Version (Commit Hash)**

If you want to pull an image for a specific version (e.g., commit hash), use:

- **Frontend Image with Version**:

  ```bash
  docker pull quay.io/kubestellar/ui:frontend-abcd1234
  ```

- **Backend Image with Version**:
  ```bash
  docker pull quay.io/kubestellar/ui:backend-abcd1234
  ```

---

## **Installing GolangCI-Lint**

To install **GolangCI-Lint** for code quality checks, follow these steps:

### **Linux & macOS**

Run the following command:

```bash
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.54.2
```

Ensure `$(go env GOPATH)/bin` is in your `PATH`:

```bash
export PATH=$(go env GOPATH)/bin:$PATH
```

### **Windows**

Use **scoop** (recommended):

```powershell
scoop install golangci-lint
```

Or **Go install**:

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### **Verify Installation**

Run:

```bash
golangci-lint --version
```

---

## **Linting & Fixing Code**

Maintaining code quality is essential for collaboration. Use these commands to check and fix linting issues:

### **Check for Issues**

```bash
make check-lint
```

### **Auto-Fix Issues**

```bash
make fix-lint
```

### **Run Both**

```bash
make lint
```

---

## Important Note

### 1. Localize All Frontend Strings

If you're adding any **new string** in the frontend UI:

- Localize the string using our existing localization setup.
- Add the string to the appropriate language file (`locales/strings.en.json`).

#### How to Localize a String:

1. Open `strings.en.json` located under `/locales/` (or appropriate path).
2. Add your new string as a key-value pair. Example:

```json
{
  "greeting": "Hello, welcome!"
}
```

3. In your component, use the localization[+] hook.[/+][-] hook or method (depending on your i18n setup). Example using `react-i18next`:[/-]

```tsx
const { t } = useTranslation();
<p>{t("greeting")}</p>;
```

---

### 2. Be Cautious With AI-Generated Code

> AI tools (like GitHub Copilot or ChatGPT) are helpful but **not always context-aware**.
> **Please DO NOT blindly copy-paste AI-generated code.**
> Before committing:

- Double-check if the code aligns with our project’s architecture.
- Test thoroughly to ensure it doesn’t break existing functionality.
- Refactor and adapt it as per the codebase standards.

---

## Contribution Commands Guide

This guide helps contributors manage issue assignments and request helpful labels via GitHub comments. These commands are supported through GitHub Actions or bots configured in the repository.

### Issue Assignment

- **To assign yourself to an issue**, comment:

  ```
  /assign
  ```

- **To remove yourself from an issue**, comment:
  ```
  /unassign
  ```

### Label Requests via Comments

You can also request labels to be automatically added to issues using the following commands:

- **To request the `help wanted` label**, comment:

  ```
  /help-wanted
  ```

- **To request the `good first issue` label**, comment:
  ```
  /good-first-issue
  ```

These commands help maintainers manage community contributions effectively and allow newcomers to find suitable issues to work on.

---
