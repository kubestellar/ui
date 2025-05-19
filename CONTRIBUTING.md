# **Contributing to Kubestellar UI**

This guide will help you set up a **Redis container**, configure **JWT authentication**, test the authentication flow using different tools, and log into Kubestellar UI.

---

## **Contents**

- [Prerequisites](#prerequisites)
- [Setup Redis Container with Docker](#setup-redis-container-with-docker)
- [Verify Redis is Running](#verify-redis-is-running)
- [Setting Up JWT Authentication](#setting-up-jwt-authentication)
- [Set Up Environment Variables](#set-up-environment-variables)
- [Export Environment Variables](#export-environment-variables-linuxmac)
- [Running the Go Backend](#running-the-go-backend)
- [Testing JWT Authentication](#testing-jwt-authentication)
- [Stopping and Removing Redis Container](#stopping-and-removing-redis-container)
- [Login to Kubestellar UI](#login-to-kubestellar-ui)
- [Docker Compose Development Cycle](#docker-compose-development-cycle)
- [Docker Image Versioning and Pulling](#docker-image-versioning-and-pulling)
- [Installing GolangCI-Lint](#installing-golangci-lint)
- [Linting & Fixing Code](#linting--fixing-code)
- [Conclusion](#conclusion)

---

## **Prerequisites**

Before proceeding, ensure you have the following installed:

- **Redis**
- **Docker** (For running Redis in a container)
- **Postman or cURL** (For API testing)
- **Go** (For running the backend)
- **OpenSSL** (For generating JWT secrets securely)

---

## **Setup Redis Container with Docker**

**Run Redis using Docker if you haven't already**

```sh
docker run --name redis -d -p 6379:6379 redis
```

### **Breakdown of Flags:**

- `--name redis` → Container name
- `-p 5432:5432` → Expose Redis on port **6379**
- `-d` → Run the container in detached mode
- `redis` → Image name

---

## **Verify Redis is Running**

**Check running containers:**

```sh
docker ps | grep redis
```

---

## **Setting Up JWT Authentication**

### **Generate a JWT Secret Key**

There are multiple ways to generate a secure JWT secret key.

#### **(1) Using OpenSSL**

```sh
openssl rand -base64 32
```

This generates a **random 32-byte** secret key.

#### **(2) Using a Python One-Liner**

```sh
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
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret Key (Replace with your generated key)
JWT_SECRET=mysecurekeygeneratedhere
```

---

## **Export Environment Variables (Linux/Mac)**

If you prefer not to use a `.env` file, you can export variables manually in your terminal:

```sh
export REDIS_HOST=localhost
export REDIS_PORT=6379
export JWT_SECRET=mysecurekeygeneratedhere
```

---

## **Running the Go Backend**

Ensure you have Go installed, then run:

```sh
go run main.go
```

**Your API is now running!**

---

## **Testing JWT Authentication**

You can either generate your JWT Token with **Postman** or **cURL.**

### **With Postman**

### **Step 1: Login and Get JWT Token**

#### **Request:**

- **Method:** `POST`
- **Endpoint:** `/login`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body:**
  ```json
  {
    "username": "admin",
    "password": " "
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
- **Endpoint:** `/protected`
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
       "password": ""
     }
     ```
   - Click **Send**, and copy the `token` from the response.

2. **Access Protected Route**
   - Make a `GET` request to `http://localhost:8080/protected`
   - Go to the **Headers** section and add:
     ```
     Authorization: Bearer <your_token>
     ```
   - Click **Send** and verify the response.

---

### **With cURL**

If you prefer the terminal, you can use `cURL`:

### **Login**

```sh
curl -X POST http://localhost:4000/login -H "Content-Type: application/json" -d '{
  "username": "admin",
  "password": ""
}'
```

### **Access Protected Route**

```sh
curl -X GET http://localhost:4000/protected -H "Authorization: Bearer <your_token>"
```

---

## **Stopping and Removing Redis Container**

**Stop the container:**

```sh
docker stop redis
```

**Remove the container:**

```sh
docker docker rm redis
```

---

## **Login to Kubestellar UI**

Run the Frontend if you haven't already

```sh
npm install

npm run dev
```

Login with these credentials

- **Username: admin**
- **Password: admin**

\*Note: You can input any word or strings of letters and numbers. Just as long as you have the username **admin.\***

---

## **Docker Compose Development Cycle**

For ongoing development with Docker Compose, follow these steps:

### **Step 1: Stop the running Application**

```sh
docker compose down
```

### **Step 2: Pull the Latest Source Code Changes**

```sh
git pull origin main
```

### **Step 3: Rebuild and Restart the Application**

```sh
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

  ```sh
  docker pull quay.io/kubestellar/ui:frontend
  ```

- **Backend Image**:
  ```sh
  docker pull quay.io/kubestellar/ui:backend
  ```

### **How to Pull Specific Version (Commit Hash)**

If you want to pull an image for a specific version (e.g., commit hash), use:

- **Frontend Image with Version**:

  ```sh
  docker pull quay.io/kubestellar/ui:frontend-abcd1234
  ```

- **Backend Image with Version**:
  ```sh
  docker pull quay.io/kubestellar/ui:backend-abcd1234
  ```

---

## **Installing GolangCI-Lint**

To install **GolangCI-Lint** for code quality checks, follow these steps:

### **Linux & macOS**

Run the following command:

```sh
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.54.2
```

Ensure `$(go env GOPATH)/bin` is in your `PATH`:

```sh
export PATH=$(go env GOPATH)/bin:$PATH
```

### **Windows**

Use **scoop** (recommended):

```powershell
scoop install golangci-lint
```

Or **Go install**:

```sh
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### **Verify Installation**

Run:

```sh
golangci-lint --version
```

---

## **Linting & Fixing Code**

Maintaining code quality is essential for collaboration. Use these commands to check and fix linting issues:

### **Check for Issues**

```sh
make check-lint
```

### **Auto-Fix Issues**

```sh
make fix-lint
```

### **Run Both**

```sh
make lint
```
