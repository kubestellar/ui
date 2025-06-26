# How to Install and Use KubeStellar UI

KubeStellar UI provides a web-based interface for managing multi-cluster Kubernetes environments with KubeStellar.

## Prerequisites

- Node.js and npm installed on your system
- Access to a running KubeStellar backend (API server)

## Installation

1. **Clone the KubeStellar repository:**
   ```bash
   git clone https://github.com/kubestellar/kubestellar.git
   cd kubestellar/ui
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the UI server:**
   ```bash
   npm run dev
   ```
4. **Access the UI:**
   Open your browser and go to [http://localhost:5173](http://localhost:5173)

## Usage

- Log in with your credentials (if authentication is enabled).
- Use the dashboard to view and manage clusters, namespaces, and resources.
- Navigate using the sidebar to access different features.

For more details, visit the [KubeStellar documentation site](https://kubestellar.io) or refer to the project README.
