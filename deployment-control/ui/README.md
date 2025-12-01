# EstateWise Deployment Control UI

A modern, feature-rich deployment control interface built with **Nuxt 3**, **Vue 3**, **TypeScript**, and **Tailwind CSS**.

<p align="center">
  <img src="../docs/ui.png" alt="Deployment Control Dashboard Screenshot" width="800"/>
</p>

## 🚀 Features

### Enhanced UI/UX
- **Modern Design**: Beautiful gradient backgrounds with glassmorphism effects
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Auto-refreshes job feed every 6 seconds
- **Loading States**: Smooth loading indicators for all async operations
- **Toast Notifications**: User-friendly success/error feedback
- **Animated Components**: Smooth transitions and micro-interactions

### Deployment Strategies
- **Blue/Green Deployments**: Zero-downtime deployments with traffic switching
- **Canary Releases**: Progressive rollouts with configurable stages
- **Rolling Restarts**: Quick deployment restarts
- **Scaling Operations**: Dynamic replica management

### State Management
- **Pinia Store**: Centralized state management with TypeScript support
- **Computed Getters**: Real-time statistics (healthy deployments, running jobs, etc.)
- **Reactive Updates**: Automatic UI updates when data changes

### Developer Experience
- **TypeScript**: Full type safety across the application
- **Component-based**: Reusable Vue 3 components with Composition API
- **Auto-imports**: Nuxt auto-imports for components and composables
- **Hot Module Replacement**: Instant feedback during development

## 📦 Installation

```bash
cd deployment-control/ui
npm install
```

## 🏃 Development

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

The API server should be running on `http://localhost:4100` (configured via `API_BASE` env variable).

## 🏗️ Production Build

Build the application for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `ui` directory:

```env
API_BASE=http://localhost:4100
```

Or set it at runtime:

```bash
API_BASE=https://your-api.example.com npm run dev
```

### Tailwind CSS

The design system uses custom colors defined in `tailwind.config.js`:

- `bg`: Primary background
- `panel`: Panel background
- `accent`: Primary accent (gold)
- `accent-2`: Secondary accent (teal)
- `success`, `danger`, `warning`: Status colors

## 📁 Project Structure

```
ui/
├── assets/
│   └── css/
│       └── main.css          # Global styles & Tailwind
├── components/
│   ├── BlueGreenForm.vue     # Blue/Green deployment form
│   ├── CanaryForm.vue        # Canary deployment form
│   ├── DeploymentCard.vue    # Deployment status card
│   ├── JobCard.vue           # Job status card
│   └── Toast.vue             # Toast notification component
├── pages/
│   └── index.vue             # Main dashboard page
├── stores/
│   └── deployment.ts         # Pinia store for deployment state
├── types/
│   └── index.ts              # TypeScript type definitions
├── nuxt.config.ts            # Nuxt configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── package.json
```

## 🎨 Component Overview

### `DeploymentCard`
Displays deployment health with:
- Ready/desired replica counts
- Health status badge
- Container images
- Visual progress bar

### `JobCard`
Shows job execution details:
- Status badge with live updates
- Execution timeline
- Command parameters (collapsible)
- Live log output

### `BlueGreenForm` & `CanaryForm`
Interactive forms with:
- Form validation
- Loading states
- Toggle switches for options
- Success/error handling

### `Toast`
Global notification system:
- Auto-dismiss after 3 seconds
- Color-coded by type (success/error/warning/info)
- Slide-in animation

## 🔌 API Integration

The UI communicates with the Express backend API at `/api`:

- `GET /api/cluster/summary` - Fetch cluster deployment status
- `GET /api/jobs` - List recent jobs
- `POST /api/deploy/blue-green` - Trigger blue/green deployment
- `POST /api/deploy/canary` - Trigger canary deployment
- `POST /api/deploy/rolling` - Trigger rolling restart
- `POST /api/ops/scale` - Scale deployment replicas

## 🚦 Key Improvements Over HTML Version

1. **Component Architecture**: Modular, reusable components vs. monolithic HTML
2. **Type Safety**: Full TypeScript support with type definitions
3. **State Management**: Pinia store for predictable state updates
4. **Better DX**: Hot reload, auto-imports, and modern tooling
5. **Enhanced UI**: Tailwind CSS utilities, smooth animations, better mobile support
6. **Real-time Stats**: Dashboard metrics with computed getters
7. **Error Handling**: Proper error boundaries and user feedback
8. **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## 📱 Responsive Design

The UI is fully responsive with breakpoints:
- Mobile: Single column layout
- Tablet: 2-column grid
- Desktop: Full dashboard layout with sidebar

## 🎯 Future Enhancements

- [ ] Real-time WebSocket updates for job status
- [ ] Deployment history with rollback capability
- [ ] Metrics visualization with Chart.js
- [ ] Dark/light theme toggle
- [ ] Multi-cluster support
- [ ] Role-based access control
- [ ] Deployment templates/presets
- [ ] Slack/Discord notifications

## 📝 License

Part of the EstateWise project. See main LICENSE file.
