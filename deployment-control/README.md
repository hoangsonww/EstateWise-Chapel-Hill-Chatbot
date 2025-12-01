# Deployment Control Dashboard

Modern UI and API to run EstateWise blue/green, canary, rolling, and scaling operations without the CLI. Built with **Nuxt 3**, **Vue 3**, **TypeScript**, and **Tailwind CSS**.

<p align="center">
  <img src="docs/ui.png" alt="Deployment Control Dashboard Screenshot" width="800"/>
</p>

## 🚀 Features

### UI Features
- 🎨 Modern glassmorphism design with animations
- 📱 Fully responsive (mobile, tablet, desktop)
- ⚡ Real-time updates with auto-refresh
- 🔔 Toast notifications for all actions
- 📊 Dashboard stats and health metrics
- 🎯 Component-based architecture with Pinia state management
- 🔒 Full TypeScript type safety
- ♿ Accessibility support (ARIA labels, semantic HTML)

### Deployment Features
- Blue/green and canary launches with custom images, stages, and safety toggles
- Rolling restarts and ad-hoc scaling for any deployment variant (stable, blue, green, canary)
- Live job feed with logs and exit codes
- Cluster snapshot (deployments + services) via `kubectl`
- Express API server with JSON endpoints

## 📦 Quick Start

### Option 1: Quick Install (Recommended)

```bash
cd deployment-control
npm run install:all
```

Then start both servers:

```bash
# Terminal 1: API Server
npm run dev     # http://localhost:4100

# Terminal 2: UI
npm run dev:ui  # http://localhost:3000
```

### Option 2: Manual Install

```bash
cd deployment-control

# Install API dependencies
npm install

# Install UI dependencies
cd ui
npm install
cd ..
```

Then start both:

```bash
# Terminal 1: API
npm run dev

# Terminal 2: UI
cd ui && npm run dev
```

Visit **http://localhost:3000** to access the deployment control dashboard.

## 📁 Project Structure

```
deployment-control/
├── src/              # API server (Express + TypeScript)
│   ├── server.ts     # Main API server
│   ├── kubectl.ts    # Kubernetes utilities
│   └── jobRunner.ts  # Job execution
│
└── ui/               # Modern Nuxt/Vue UI
    ├── components/   # Vue components
    ├── pages/        # Pages/routes
    ├── stores/       # Pinia state management
    ├── types/        # TypeScript definitions
    └── assets/       # Styles and assets
```

## 🔧 Configuration

The UI connects to the API server via environment variable:

```bash
cd ui
cp .env.example .env
```

Edit `.env`:
```
API_BASE=http://localhost:4100
```

## 📚 Documentation

Full documentation available in `ui/`:
- [README.md](./ui/README.md) - Main documentation
- [START.md](./ui/START.md) - Quick start guide

The server uses your current `kubectl` context. Set `KUBECTL=/custom/bin/kubectl` if you need a different binary. Default namespace is `estatewise`; override from the top-right namespace field in the UI.

## API

All endpoints are relative to the server root (default `http://localhost:4100`).

- `POST /api/deploy/blue-green` – Body: `image` (required), `serviceName`, `namespace`, `autoSwitch`, `smokeTest`, `scaleDownOld`
- `POST /api/deploy/canary` – Body: `image` (required), `serviceName`, `namespace`, `canaryStages`, `stageDuration`, `autoPromote`, `enableMetrics`, `canaryReplicasStart`, `stableReplicas`
- `POST /api/deploy/rolling` – Body: `serviceName`, `namespace`, `kubectl` (optional override)
- `POST /api/ops/scale` – Body: `serviceName`, `namespace`, `replicas` (number), `variant` (`blue`, `green`, `canary`, or empty for stable), `kubectl` (optional override)
- `GET /api/jobs` and `GET /api/jobs/:id` – Job history and output
- `GET /api/cluster/summary?namespace=estatewise` – Snapshot of deployments/services via `kubectl`

## Notes

- The dashboard keeps only the last 500 log lines per job in memory. Persist results elsewhere if you need long-term history.
- Long-running deploys stream back to the job feed; refresh or use the **Refresh** button to update.
- The server runs commands from the repo root so relative scripts and manifests resolve correctly.
