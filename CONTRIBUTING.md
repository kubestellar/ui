# **📜 Contribution Guide - Setting Up Redis, JWT Authentication, Testing, and Loggin into Kubestellar UI**  

This guide will help you set up a **Redis container**, configure **JWT authentication**, test the authentication flow using different tools, and log into Kubestellar UI.  

---

## **1️⃣ Prerequisites**  
Before proceeding, ensure you have the following installed: 
- **Redis** 
- **Docker** 🐳 (For running Redis in a container)  
- **Postman or cURL** (For API testing)  
- **Go** (For running the backend)  
- **OpenSSL** (For generating JWT secrets securely)  

---

## **2️⃣ Setup Redis Container with Docker**  

🔹 **Run Redis using Docker if you haven't already**  
```sh
docker run --name redis -d -p 6379:6379 redis
```
### **Breakdown of Flags:**  
- `--name redis` → Container name  
- `-p 5432:5432` → Expose Redis on port **6379**  
- `-d` → Run the container in detached mode  
- `redis` → Image name 

---

## **3️⃣ Verify Redis is Running**  

🔹 **Check running containers:**  
```sh
docker ps | grep redis
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

🔹 Create a **`.env`** file in the **`/backend`** directory (where `main.go` is located):  
```ini
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret Key (Replace with your generated key)
JWT_SECRET=mysecurekeygeneratedhere
```

---

## **6️⃣ Export Environment Variables (Linux/Mac)**
If you prefer not to use a `.env` file, you can export variables manually in your terminal:

```sh
export REDIS_HOST=localhost
export REDIS_PORT=6379
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

You can either generate your JWT Token with **Postman** or **cURL.**

### ***With Postman***
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

### **🔹 Step 3: Testing with Postman**   

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

### ***With cURL***
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

## **9️⃣ Stopping and Removing Redis Container**  

🔹 **Stop the container:**  
```sh
docker stop redis
```
🔹 **Remove the container:**  
```sh
docker docker rm redis
```

---

 ## **🔟 Login to Kubestellar UI**

🔹 Run the Frontend if you haven't already
```sh
npm install

npm run dev
```

🔹 Login with these credentials
* **Username: admin**
* **Password: admin**

*Note: You can input any word or strings of letters and numbers. Just as long as you have the username **admin.***

---

## **🎯 Conclusion**
You have successfully:

✅ Set up a Redis container using Docker  
✅ Created and managed environment variables  
✅ Configured JWT authentication in your Go backend  
✅ Tested the authentication process using Postman and or cURL   
✅ Logged into the Kubestellar UI 

---

🔥 **Happy coding!** 🚀