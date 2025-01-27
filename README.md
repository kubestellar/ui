
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

To simplify managing different environment variables, rename the `example.env` file to `.env` in the project root directory (where `package.json` is located).

**Example `.env` file**:

```
VITE_BASE_URL=http://localhost:4000
```

This is because `.env` files are intended to be a personal environment configuration file. The included `example.env` in the repo is a standard that most other node projects include for the same purpose. You rename the file to `.env` and then change it's contents to align with your system and personal needs.

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

## Contributors

<!-- readme: collaborators,contributors -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/yashpandey06">
                    <img src="https://avatars.githubusercontent.com/u/97700473?v=4" width="100;" alt="yashpandey06"/>
                    <br />
                    <sub><b>Yash Pandey</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/clubanderson">
                    <img src="https://avatars.githubusercontent.com/u/407614?v=4" width="100;" alt="clubanderson"/>
                    <br />
                    <sub><b>Andy Anderson</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/katamyra">
                    <img src="https://avatars.githubusercontent.com/u/45225228?v=4" width="100;" alt="katamyra"/>
                    <br />
                    <sub><b>Krish Katariya</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/manzil-infinity180">
                    <img src="https://avatars.githubusercontent.com/u/119070053?v=4" width="100;" alt="manzil-infinity180"/>
                    <br />
                    <sub><b>Rahul Vishwakarma</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/Gmin2">
                    <img src="https://avatars.githubusercontent.com/u/127925465?v=4" width="100;" alt="Gmin2"/>
                    <br />
                    <sub><b>Mintu Gogoi</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/RealRTorres">
                    <img src="https://avatars.githubusercontent.com/u/72537940?v=4" width="100;" alt="RealRTorres"/>
                    <br />
                    <sub><b>RealRTorres</b></sub>
                </a>
            </td>
		</tr>
		<tr>
            <td align="center">
                <a href="https://github.com/Jayesh0167">
                    <img src="https://avatars.githubusercontent.com/u/191938611?v=4" width="100;" alt="Jayesh0167"/>
                    <br />
                    <sub><b>Jayesh Savaliya</b></sub>
                </a>
            </td>
            <td align="center">
                <a href="https://github.com/onkar717">
                    <img src="https://avatars.githubusercontent.com/u/144542684?v=4" width="100;" alt="onkar717"/>
                    <br />
                    <sub><b>Onkar Raghunath Shelke</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: collaborators,contributors -end -->