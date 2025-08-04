Here’s the **final, fully production-ready `CONTRIBUTING.md`** including everything:
✔ Industry-level structure
✔ Commit message guidelines
✔ PR checklist
✔ Issue & PR templates in Markdown

---

# **Contributing to Kubestellar UI**

Thank you for contributing to **Kubestellar UI**!
This guide provides everything you need to set up the environment, follow coding standards, and make high-quality contributions.

---

## **Table of Contents**

- [Prerequisites](#prerequisites)
- [Setup Environment](#setup-environment)

  - [Using Docker Compose (Recommended)](#using-docker-compose-recommended)
  - [Alternative: Individual Containers](#alternative-individual-containers)

- [Environment Variables](#environment-variables)
- [Run Backend](#run-backend)
- [Test JWT Authentication](#test-jwt-authentication)
- [Run Frontend](#run-frontend)
- [Stop and Clean Containers](#stop-and-clean-containers)
- [Docker Workflow](#docker-workflow)
- [Docker Image Versioning](#docker-image-versioning)
- [Code Quality and Linting](#code-quality-and-linting)
- [Localization Guidelines](#localization-guidelines)
- [AI-Generated Code Policy](#ai-generated-code-policy)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Checklist](#pull-request-checklist)
- [Contribution Workflow](#contribution-workflow)
- [Issue Assignment and Labels](#issue-assignment-and-labels)

---

## **Prerequisites**

Install:

- Docker & Docker Compose
- Go
- Node.js & npm
- OpenSSL (for JWT)
- Postman or cURL
- Make (backend scripts)
- Air (optional hot reload)

---

## **Setup Environment**

### **Using Docker Compose (Recommended)**

```bash
cd backend
docker compose up -d
docker ps
```

Services:

- PostgreSQL → 5432
- Redis → 6379

---

### **Alternative: Individual Containers**

```bash
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
docker run --name redis -p 6379:6379 -d redis
```

---

## **Environment Variables**

Create `.env` in `/backend`:

```ini
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=kubestellar
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_secure_key
```

Generate secret:

```bash
openssl rand -base64 32
```

---

## **Run Backend**

```bash
cd backend
go mod download
make dev    # Hot reload
# OR
go run main.go
```

API: `http://localhost:4000`

---

## **Test JWT Authentication**

### **Login**

```
POST http://localhost:4000/login
{
  "username": "admin",
  "password": "admin"
}
```

Response:

```json
{ "token": "your_jwt_token" }
```

### **Access Protected**

```
GET http://localhost:4000/protected
Authorization: Bearer <your_jwt_token>
```

---

## **Run Frontend**

```bash
npm install
npm run dev
```

Login:

```
Username: admin
Password: admin
```

---

## **Stop and Clean Containers**

```bash
docker compose down
docker compose down -v  # remove volumes
```

---

## **Docker Workflow**

```bash
docker compose down
git pull origin main
docker compose up --build
```

---

## **Docker Image Versioning**

Images:

- `quay.io/kubestellar/ui:frontend`
- `quay.io/kubestellar/ui:backend`

Pull:

```bash
docker pull quay.io/kubestellar/ui:frontend
docker pull quay.io/kubestellar/ui:backend
```

---

## **Code Quality and Linting**

Install **GolangCI-Lint**:

```bash
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.54.2
```

Run:

```bash
make check-lint
make fix-lint
make lint
```

---

## **Localization Guidelines**

- Localize all strings using `react-i18next`.
- Add keys in `locales/strings.en.json`.

Example:

```json
{ "welcome": "Welcome to Kubestellar UI" }
```

Usage:

```tsx
const { t } = useTranslation();
<p>{t("welcome")}</p>;
```

---

## **AI-Generated Code Policy**

- Do **not** copy blindly.
- Verify code fits architecture.
- Test before committing.

---

## **Commit Message Guidelines**

Follow **Conventional Commits**:

```
<type>(scope): short description
```

Types:

- `feat` → New feature
- `fix` → Bug fix
- `docs` → Docs changes
- `style` → Code formatting
- `refactor` → Code restructuring
- `test` → Tests
- `chore` → Build/CI changes

Examples:

```
feat(auth): add JWT authentication
fix(ui): align login button
```

---

## **Pull Request Checklist**

- [ ] PR title follows Conventional Commits
- [ ] All tests pass
- [ ] Code linted & formatted
- [ ] No console errors
- [ ] Documentation updated
- [ ] Added tests (if applicable)

---

## **Contribution Workflow**

1. **Fork** repository
2. Create branch:

   ```bash
   git checkout -b feature/your-feature
   ```

3. Commit using guidelines
4. Push & open PR

---

## **Issue Assignment and Labels**

Assign:

```
/assign
```

Unassign:

```
/unassign
```

Labels:

```
/help-wanted
/good-first-issue
```

---

✅ **Following this guide ensures production-grade contributions.**

---

### **ISSUE TEMPLATE (issue_template.md)**

```markdown
## **Issue Description**

(Explain the issue clearly)

### **Steps to Reproduce**

1.
2.
3.

### **Expected Behavior**

(What should happen?)

### **Actual Behavior**

(What is happening?)

### **Screenshots/Logs**

(If applicable)

---

**Additional Info:**
(Add context, environment, etc.)
```

---

### **PR TEMPLATE (pull_request_template.md)**

```markdown
## **Description**

(Explain what this PR does)

### **Changes**

-
-
-

### **Checklist**

- Title follows Conventional Commits
- Tests added (if needed)
- Code formatted & linted
- No console errors
- Docs updated (if applicable)

### **Related Issues**

Closes #
```
