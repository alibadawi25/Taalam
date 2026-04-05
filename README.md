# 🕌 Deen Learning Platform

A beautiful Arabic-first Islamic learning platform built with React, featuring course management, Supabase integration, and a responsive design optimized for RTL languages.

**Live URL:** https://taalamdeenak.pages.dev/

---

## ✨ Project Overview

Deen Learning Platform is a modern, Arabic-first Islamic learning platform designed for accessibility, speed, and a beautiful user experience. Built with React and Vite, it features real-time course management via Supabase, responsive RTL design, and reusable smart components. The platform is optimized for both learners and educators, supporting YouTube-based courses, progress tracking, and a scalable database schema. Visit the live site at [taalamdeenak.pages.dev](https://taalamdeenak.pages.dev/).

### Key Features

- 🎨 **Beautiful Course Cards** - YouTube-optimized thumbnails (16:9), smooth animations, RTL support
- 📚 **Supabase Integration** - Real-time course data with automatic fallback to placeholders
- 🌐 **Fully Responsive** - Mobile-first design with tablet and desktop optimizations
- 🇸🇦 **Arabic-First** - RTL layout, Amiri font, proper Arabic typography
- ⚡ **Fast & Modern** - React 19, Vite 8, optimized bundle size
- 🎯 **Smart Components** - Reusable CourseCard and PathCard components

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Git installed

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/your-username/deen-learning.git
cd deen-learning
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:5173
```

4. **Start development server:**

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

## 📦 Tech Stack

- **Frontend:** React 19 with Hooks
- **Build Tool:** Vite 8
- **Database:** Supabase (PostgreSQL)
- **Routing:** React Router v7
- **Animations:** Three.js + @react-three/fiber
- **Styling:** CSS with custom properties (no frameworks)
- **Linting:** ESLint 9

## 📁 Project Structure

```
deen-learning/
├── src/
│   ├── components/
│   │   ├── CourseCard.jsx       # Main course card component
│   │   ├── CourseCard.css       # Card styling
│   │   ├── PathCard.jsx         # Learning path card
│   │   ├── PathCard.css
│   │   └── Silk.jsx             # 3D background animation
│   ├── pages/
│   │   ├── LandingPage.jsx      # Homepage with course showcase
│   │   └── LandingPage.css
│   ├── supabaseClient.js        # Supabase initialization
│   ├── courseService.js         # Course data fetching & mapping
│   ├── placeholderCourses.js    # Fallback course data
│   ├── App.jsx
│   └── main.jsx
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── .env.example                 # Environment variables template
├── package.json
└── vite.config.js
```

## 🗄️ Database Schema

The platform uses Supabase with the following tables:

### `courses`

- `id` - bigint (primary key)
- `title` - text
- `description` - text
- `youtube_playlist_id` - text
- `thumbnail_url` - text
- `difficulty` - text (beginner/intermediate/advanced)
- `course_type` - text
- `category_id` - bigint (foreign key)
- `created_at` - timestamp

### `categories`

- `id` - bigint (primary key)
- `name` - text
- `slug` - text
- `description` - text

### `lessons`

- `id` - bigint (primary key)
- `course_id` - bigint (foreign key)
- `title` - text
- `youtube_video_id` - text
- `duration_seconds` - integer
- `order_index` - integer

### `tags`, `course_tags`, `notes`, `lesson_progress`

Additional tables for tagging, notes, and progress tracking.

## 🎨 Components

### CourseCard

Beautiful, reusable course card with:

- 16:9 YouTube thumbnail ratio
- Progress tracking
- Difficulty badges
- RTL-optimized layout
- Smooth hover animations

**Props:**

```javascript
<CourseCard
  title="Course title"
  instructor="Instructor name"
  description="Course description"
  duration="12 ساعة"
  lessonsCount={24}
  level="مبتدئ"
  category="القرآن"
  thumbnail="https://..."
  progress={35}
  isFeatured={true}
  onStart={() => {}}
  onContinue={() => {}}
/>
```

### PathCard

Learning path card for multi-course tracks (future feature).

## 🔧 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🌍 Environment Variables

Create a `.env` file with these variables:

| Variable                        | Description                      | Required |
| ------------------------------- | -------------------------------- | -------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL        | Yes      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key    | Yes      |
| `VITE_APP_URL`                  | Application URL (for production) | No       |

**Important:** Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client.

## 🐛 Troubleshooting

### Environment variables not loading

1. Stop the dev server (Ctrl + C)
2. Restart it: `npm run dev`
3. Clear browser cache and refresh

### Courses not showing

- Check browser console for errors
- Verify Supabase credentials in `.env`
- Placeholder courses will load automatically if database is empty/unavailable

### Build errors

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Build

```bash
npm run build
# Upload 'dist' folder to your hosting
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for learning or production.

## 🙏 Acknowledgments

- Arabic typography: [Google Fonts - Amiri](https://fonts.google.com/specimen/Amiri)
- Database: [Supabase](https://supabase.com)
- Build tool: [Vite](https://vitejs.dev)
- 3D effects: [Three.js](https://threejs.org)

---

**Built with ❤️ for the Muslim community**
