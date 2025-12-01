# Quick Start Guide

## 🚀 Running the Nuxt UI

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- API server running (or configured to connect to remote API)

### Step 1: Install Dependencies
```bash
cd deployment-control/ui
npm install
```

### Step 2: Configure API (Optional)
Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```
API_BASE=http://localhost:4100
```

### Step 3: Start Development Server
```bash
npm run dev
```

The UI will be available at **http://localhost:3000**

### Step 4: Start API Server (in another terminal)
```bash
cd deployment-control
npm install
npm run dev
```

The API will be available at **http://localhost:4100**

## 📦 Production Build

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Generate Static Site (SSG)
```bash
npm run generate
```

Output will be in `.output/public/` directory.

## 🔧 Development Workflow

### 1. Make Changes
Edit files in:
- `components/` - Vue components
- `pages/` - Pages/routes
- `stores/` - Pinia state management
- `assets/css/` - Styles

### 2. Hot Reload
Changes are automatically reflected in the browser (HMR).

### 3. Check Console
Open browser DevTools to see:
- Network requests
- Console logs
- Vue DevTools (if installed)

### 4. Test API Integration
Ensure API server is running and accessible.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### API Connection Error
- Check if API server is running on port 4100
- Verify `API_BASE` in `.env`
- Check CORS settings in API server

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .nuxt .output node_modules
npm install
npm run dev
```

### TypeScript Errors
```bash
# Regenerate types
npm run postinstall
```

## 📚 Useful Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run generate     # Generate static site

# Utilities
npx nuxi info        # Show Nuxt info
npx nuxi analyze     # Analyze bundle size
npx nuxi typecheck   # Run TypeScript check
```

## 🎯 Next Steps

1. **Customize Design**: Edit `tailwind.config.js` and `assets/css/main.css`
2. **Add Features**: Create new components in `components/`
3. **Add Pages**: Create new routes in `pages/`
4. **Extend Store**: Add actions/getters in `stores/deployment.ts`
5. **Add Types**: Define interfaces in `types/index.ts`

## 📖 Documentation

- [Nuxt 3 Docs](https://nuxt.com/docs)
- [Vue 3 Docs](https://vuejs.org/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Pinia Docs](https://pinia.vuejs.org/)

## 💡 Tips

- Use Vue DevTools browser extension for debugging
- Install Volar extension for VS Code
- Enable Nuxt DevTools in `nuxt.config.ts`
- Use `console.log()` sparingly - use Vue DevTools instead
- Keep components small and focused
- Use TypeScript for better DX

## 🤝 Contributing

When adding new features:
1. Create component in `components/`
2. Add types to `types/index.ts`
3. Update store if needed
4. Add documentation
5. Test on mobile and desktop
6. Check accessibility (ARIA labels, keyboard nav)
