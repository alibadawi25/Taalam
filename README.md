# Taallam Landing Page

A React + Vite landing page for the Arabic learning platform "Taallam".

Live URL: https://talaamplatform.vercel.app/

## Tech Stack

- React 19
- React Router
- Vite 8
- Three.js + `@react-three/fiber` (for animated visual effects)
- ESLint 9

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Available Scripts

- `npm run dev` - Run Vite in development mode
- `npm run build` - Create an optimized production build
- `npm run preview` - Serve the production build locally
- `npm run lint` - Run ESLint checks

## Project Structure

```text
src/
  App.jsx
  main.jsx
  index.css
  components/
    Silk.jsx
    Silk.css
  pages/
    HomePage.jsx
    HomaPage.css
public/
  favicon.svg
  icons.svg
```

## Environment Variables

If you need backend integration later, copy `.env.example` to `.env` and fill the values:

```bash
cp .env.example .env
```

Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_URL`

## Notes

- The home route is lazy-loaded to reduce initial bundle load.
- `index.html` is configured for Arabic (`lang="ar"` and `dir="rtl"`), with improved SEO and social metadata.
