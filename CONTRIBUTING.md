# **📜 Contribution Guide - Setting Up PostgreSQL, JWT Authentication, and Testing**  

This guide will help you set up a **PostgreSQL container**, configure **JWT authentication**, and test the authentication flow using different tools.  

---

## **1️⃣ Prerequisites**  
Before proceeding, ensure you have the following installed:  
- **Docker** 🐳 (For running PostgreSQL in a container)  
- **Postman or cURL** (For API testing)  
- **Go** (For running the backend)  
- **OpenSSL** (For generating JWT secrets securely)  

---

## **2️⃣ Setup PostgreSQL Container with Docker**  

🔹 **Run the following command to start a PostgreSQL container:**  
```sh
docker run --name jwt-auth-db -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=jwt_auth -p 5432:5432 -d postgres
```
### **Breakdown of Flags:**  
- `--name jwt-auth-db` → Container name  
- `-e POSTGRES_USER=admin` → Set the default PostgreSQL user  
- `-e POSTGRES_PASSWORD=admin` → Set the default PostgreSQL password  
- `-e POSTGRES_DB=jwt_auth` → Set the default database name  
- `-p 5432:5432` → Expose PostgreSQL on port **5432**  
- `-d postgres` → Run the container in detached mode  

---

## **3️⃣ Verify PostgreSQL is Running**  

🔹 **Check running containers:**  
```sh
docker ps
```
🔹 **Access the PostgreSQL shell:**  
```sh
docker exec -it jwt-auth-db psql -U admin -d jwt_auth
```
🔹 **List tables (after the Go app runs the migrations):**  
```sql
\dt
```

---

## **4️⃣ Setting Up JWT Authentication**  

### **🔐 Generate a JWT Secret Key**  
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

## **5️⃣ Set Up Environment Variables**  

🔹 Create a **`.env`** file in the project root directory:  
```ini
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=admin
DB_NAME=jwt_auth

# JWT Secret Key (Replace with your generated key)
JWT_SECRET=mysecurekeygeneratedhere
```

---

## **6️⃣ Export Environment Variables (Linux/Mac)**
If you prefer not to use a `.env` file, you can export variables manually in your terminal:

```sh
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=admin
export DB_PASSWORD=admin
export DB_NAME=jwt_auth
export JWT_SECRET=mysecurekeygeneratedhere
```

---

## **7️⃣ Running the Go Backend**
Ensure you have Go installed, then run:

```sh
go run main.go
```

🚀 **Your API is now running!**

---

## **8️⃣ Testing JWT Authentication**  

### **🔹 Step 1: Login and Get JWT Token**
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

### **🔹 Step 2: Access Protected Route**  

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

## **9️⃣ Testing with Postman**  

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

## **🔟 Alternative: Testing with cURL**  
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

## **1️⃣1️⃣ Stopping and Removing PostgreSQL Container**  

🔹 **Stop the container:**  
```sh
docker stop jwt-auth-db
```
🔹 **Remove the container:**  
```sh
docker rm jwt-auth-db
```

---

## **🎯 Conclusion**
You have successfully:
✅ Set up a PostgreSQL container using Docker  
✅ Created and managed environment variables  
✅ Configured JWT authentication in your Go backend  
✅ Tested the authentication process using Postman and cURL  

---

🔥 **Happy coding!** 🚀