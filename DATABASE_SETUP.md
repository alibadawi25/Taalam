# Database Setup Guide — Deen Learning App

## Overview

Your app now has complete support for **user/profile-based data** with fallback to **localStorage for guests**. All data syncs bidirectionally between local storage and Supabase.

---

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SUPABASE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐        │
│  │  auth.users  │  │  profiles  │  │   courses    │        │
│  │  (native)    │→ │ (auto-sync)│  │ (cache-only) │        │
│  └──────────────┘  └────────────┘  └──────────────┘        │
│         │                                   │               │
│         │                           ┌───────┴────────┐      │
│         │                           │                │      │
│         └──────────┬────────────────┼──────┬─────────┘      │
│                    │                │      │                │
│         ┌──────────▼──────┐ ┌──────▼───┐  │                │
│         │ lesson_progress │ │ lessons  │  │                │
│         │  (user synced)  │ │(linked)  │  │                │
│         └─────────────────┘ └──────────┘  │                │
│                                           │                │
│         ┌──────────────────────────────────┘                │
│         │                                                   │
│         └──────────────┐                                    │
│              ┌─────────▼────────────┐                       │
│              │ favorite_courses     │                       │
│              │  (user synced)       │                       │
│              └──────────────────────┘                       │
│                                                              │
│         ┌─────────────────────────────────────┐             │
│         │       guest_sessions (optional)     │             │
│         │  Track anonymous user activity     │             │
│         └─────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Tables Reference

### 1. `profiles` ✓ (Auto-created by Supabase Auth)

**Purpose:** User profile data linked to Supabase Auth

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Foreign key to `auth.users.id` |
| `email` | TEXT (UNIQUE) | User email from auth |
| `full_name` | TEXT | User display name |
| `avatar_url` | TEXT | Profile picture URL |
| `bio` | TEXT | User bio (optional) |
| `created_at` | TIMESTAMP | Auto-set on signup |
| `updated_at` | TIMESTAMP | Updated on profile edit |

**RLS Policies:**
- Users can read/write their own profile
- System auto-creates profile on signup via trigger

**When synced:** On signup, user profile update, or manual `.fetchProfile(userId)`

---

### 2. `courses` ✓ (Cache-only, no user sync)

**Purpose:** Course metadata (fetched from external API, cached locally)

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT (PK) | Unique course ID |
| `title` | TEXT | Course name (Arabic) |
| `description` | TEXT | Full course description |
| `instructor_name` | TEXT | Instructor name |
| `instructor_avatar_url` | TEXT | Avatar image |
| `category` | TEXT | e.g. "Islamic Studies", "Quran" |
| `level` | TEXT | "beginner" \| "intermediate" \| "advanced" |
| `image_url` | TEXT | Course cover image |
| `featured` | BOOLEAN | Show on landing page |
| `rating` | NUMERIC(3,2) | e.g. 4.5 |
| `review_count` | INT | Number of reviews |
| `lesson_count` | INT | Count of lessons |
| `duration_minutes` | INT | Total course duration |
| `created_at` | TIMESTAMP | When added to database |
| `updated_at` | TIMESTAMP | When last updated |

**Indexes:** `category`, `level`, `featured`

**When synced:** Seed once from your API, update manually as needed

---

### 3. `lessons` ✓ (Linked to courses)

**Purpose:** Individual video lessons within courses

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT (PK) | Unique lesson ID |
| `course_id` | BIGINT (FK) | References `courses.id` |
| `title` | TEXT | Lesson name |
| `description` | TEXT | Lesson notes |
| `video_url` | TEXT | Video file URL |
| `duration_seconds` | INT | Video length in seconds |
| `order_index` | INT | Sequence in course (1, 2, 3...) |
| `created_at` | TIMESTAMP | When added |
| `updated_at` | TIMESTAMP | When last updated |

**Indexes:** `course_id`

**When synced:** Seed with courses from your API

---

### 4. `lesson_progress` ✓ (Per-user, synced from localStorage)

**Purpose:** Track which videos a user has watched, how far, completion status

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL (PK) | Auto-increment |
| `user_id` | UUID (FK) | References `auth.users.id` |
| `lesson_id` | BIGINT (FK) | References `lessons.id` |
| `last_position_seconds` | INT | Where user left off |
| `furthest_position_seconds` | INT | Farthest point reached |
| `is_completed` | BOOLEAN | Mark lesson as done |
| `created_at` | TIMESTAMP | First view |
| `updated_at` | TIMESTAMP | Last view |
| **UNIQUE** | `(user_id, lesson_id)` | One row per user per lesson |

**RLS Policies:**
- Users can only read/write their own progress
- Checked by `auth.uid() = user_id`

**When synced:**
1. Guest watches lesson → saved to localStorage
2. Guest logs in → `syncLocalLessonProgressToDatabase()` merges all progress
3. User watches lesson → instantly synced to database
4. User logs out → progress stays in localStorage

---

### 5. `favorite_courses` ✓ (Per-user, synced from localStorage)

**Purpose:** Track which courses a user has bookmarked

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGSERIAL (PK) | Auto-increment |
| `user_id` | UUID (FK) | References `auth.users.id` |
| `course_id` | BIGINT (FK) | References `courses.id` |
| `created_at` | TIMESTAMP | When bookmarked |
| **UNIQUE** | `(user_id, course_id)` | One bookmark per user per course |

**RLS Policies:**
- Users can only read/write their own bookmarks
- Checked by `auth.uid() = user_id`

**When synced:**
1. Guest bookmarks course → saved to localStorage
2. Guest logs in → `syncLocalFavoriteCoursesToDatabase()` merges all bookmarks
3. User bookmarks course → instantly synced to database
4. User logs out → bookmarks stay in localStorage

---

### 6. `guest_sessions` (Optional — for tracking guest behavior)

**Purpose:** Optionally track anonymous user sessions

**Columns:**
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Unique session ID |
| `session_token` | TEXT (UNIQUE) | For session validation |
| `last_activity` | TIMESTAMP | Last action timestamp |
| `created_at` | TIMESTAMP | Session start |
| `expires_at` | TIMESTAMP | Auto-clean after 30 days |

**Optional usage:** Create on first visit, update on activity, store in localStorage

---

## Data Flow: Guest → Authenticated User

```
┌─────────────────────────────────────────────────────────────┐
│ GUEST USER (No auth)                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Watch video lesson → lessonProgressService.upsertProgress()│
│       ↓                                                      │
│  Saved to localStorage (LESSON_PROGRESS_STORAGE_KEY)        │
│       ↓                                                      │
│  Bookmark course → favoriteCourses.toggleFavoriteCourseId() │
│       ↓                                                      │
│  Saved to localStorage (FAVORITE_COURSES_STORAGE_KEY)       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ All data stored locally. Nothing in Supabase.        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                    ↓ User clicks "Sign Up"

┌─────────────────────────────────────────────────────────────┐
│ SIGN UP FLOW                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. signUpWithPassword() → Creates auth.users row           │
│  2. Trigger fires → Auto-create profiles row                │
│  3. AuthContext logs user in                                │
│  4. useAuth() hook runs post-auth initialization:           │
│       • syncLocalLessonProgressToDatabase()                 │
│       • syncLocalFavoriteCoursesToDatabase()                │
│       • fetchFavoriteCourseIdsForCurrentUser()              │
│  5. All localStorage data merged into Supabase              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                    ↓ User is now authenticated

┌─────────────────────────────────────────────────────────────┐
│ AUTHENTICATED USER                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Watch video lesson → lessonProgressService.upsertProgress()│
│       ↓                                                      │
│  User ID detected → Saved to lesson_progress table          │
│       ↓                                                      │
│  Bookmark course → setFavoriteCourseStateForCurrentUser()   │
│       ↓                                                      │
│  User ID detected → Saved to favorite_courses table         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ All changes synced to Supabase in real-time.         │   │
│  │ Also still saved to localStorage for offline.        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Set Up

### Step 1: Run the Migration SQL

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a new query
3. Copy the entire contents of `supabase-migration.sql`
4. Paste into the editor
5. Click **RUN** button
6. Wait for success message ✓

**What happens:**
- ✓ `profiles` table created (with auto-signup trigger)
- ✓ `courses` table created
- ✓ `lessons` table created
- ✓ `lesson_progress` table created (with RLS)
- ✓ `favorite_courses` table created (with RLS)
- ✓ `guest_sessions` table created (optional)
- ✓ All indexes created
- ✓ Row Level Security policies set up

### Step 2: Seed Course Data

Your courses/lessons probably come from an external API. You have two options:

**Option A: Seed manually via Supabase Dashboard**
1. Go to **Supabase Dashboard** → **Table Editor**
2. Click `courses` table → **Insert Row**
3. Fill in title, description, instructor, etc.
4. Save
5. Click `lessons` table → **Insert Rows** linked to courses

**Option B: Seed via Node.js script**

Create `scripts/seed-courses.js`:
```javascript
import { supabase } from "../src/supabaseClient.js";

const coursesData = [
  {
    id: 1,
    title: "سورة الفاتحة",
    description: "...",
    instructor_name: "Sheikh Ahmed",
    category: "Quran",
    level: "beginner",
    featured: true,
    rating: 4.8,
    review_count: 245,
    lesson_count: 10,
    duration_minutes: 120,
  },
  // ... more courses
];

async function seedCourses() {
  const { error } = await supabase
    .from("courses")
    .upsert(coursesData, { onConflict: "id" });
  
  if (error) console.error("Seed failed:", error);
  else console.log("✓ Courses seeded");
}

seedCourses();
```

Then run:
```bash
node scripts/seed-courses.js
```

### Step 3: Test the Flow

**Test as guest:**
1. Open app at `localhost:5173/home`
2. Watch a lesson → Check browser localStorage for `taallam.lesson_progress.v1`
3. Bookmark a course → Check localStorage for `favorite_course_ids`

**Test signup sync:**
1. Click "دخول" → "حساب جديد"
2. Sign up with test@example.com / password
3. Should redirect to `/home`
4. Check Supabase Dashboard → `lesson_progress` table → should see your guest progress synced ✓
5. Check Supabase Dashboard → `favorite_courses` table → should see your bookmarks synced ✓

**Test authenticated sync:**
1. Log in with same email
2. Watch another lesson
3. Check Supabase → `lesson_progress` → should update in real-time ✓
4. Bookmark another course
5. Check Supabase → `favorite_courses` → should update in real-time ✓

---

## Available API Functions

### From `authService.js`

```javascript
// Get current session
const session = await getCurrentSession();

// Fetch user profile
const profile = await fetchProfile(userId);

// Create/update user profile (auto-called on signup)
const profile = await ensureProfileForUser(user);

// Update user profile
const updated = await updateProfile(userId, { fullName });

// Sign up with email/password
const result = await signUpWithPassword({ email, password, fullName });

// Sign in with email/password
const result = await signInWithPassword({ email, password });

// Sign in with Google
const result = await signInWithGoogle();

// Sign out
await signOutCurrentUser();
```

### From `lessonProgressService.js`

```javascript
// Get all lesson progress for specific lessons
const progress = await fetchLessonProgressByLessonIds([1, 2, 3]);

// Save/update lesson progress
const saved = await upsertLessonProgress(lessonId, {
  lastPositionSeconds: 120,
  furthestPositionSeconds: 150,
  isCompleted: false,
});

// Compute course completion percentage
const percent = computeCourseProgressPercent(lessons, progressMap);

// Check if lesson is completed
const done = isLessonCompleted(lesson, progressEntry);

// Get local progress stats
const stats = getLocalProgressStats();
// Returns: {
//   totalLessonsWithProgress: 5,
//   completedLessonsCount: 2,
//   totalLearningSeconds: 3600,
//   totalLearningHours: 1,
// }

// Sync all local progress to database
const synced = await syncLocalLessonProgressToDatabase();
```

### From `favoriteCourses.js`

```javascript
// Get user's favorite course IDs from localStorage
const favIds = readFavoriteCourseIds();

// Save favorite IDs to localStorage
saveFavoriteCourseIds(favIds);

// Toggle a course favorite locally
const updated = toggleFavoriteCourseId(currentIds, courseId);

// Check if course is favorited
const isFav = isFavoriteCourse(favIds, courseId);

// Fetch user's favorite course IDs from Supabase
const favIds = await fetchFavoriteCourseIdsForCurrentUser();

// Set/unset favorite in Supabase (for authenticated users)
await setFavoriteCourseStateForCurrentUser(courseId, true/false);

// Sync all local favorites to database
const synced = await syncLocalFavoriteCoursesToDatabase();
```

---

## Security Model (Row Level Security)

All user-specific tables use Postgres RLS to enforce data isolation:

```sql
-- lesson_progress: Users can only see/modify their own rows
SELECT * FROM lesson_progress WHERE user_id = auth.uid()

-- favorite_courses: Users can only see/modify their own rows
SELECT * FROM favorite_courses WHERE user_id = auth.uid()

-- profiles: Users can see/modify only their own profile
SELECT * FROM profiles WHERE id = auth.uid()

-- courses & lessons: PUBLIC READ (everyone sees all courses)
-- No write access (admin-only, via admin API keys)
```

This means:
- ✓ User A cannot see User B's progress
- ✓ User A cannot delete User B's bookmarks
- ✓ Users cannot modify course/lesson data
- ✓ Guests (not authenticated) get NULL for `auth.uid()` and see nothing in secure tables

---

## Troubleshooting

### Issue: Profile not auto-created on signup

**Solution:** Check if `on_auth_user_created` trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

If not, rerun the migration SQL.

### Issue: Lesson progress not syncing to database

**Check:**
1. User is logged in: `auth.uid()` is not NULL
2. Run `syncLocalLessonProgressToDatabase()` manually in console:
   ```javascript
   import { syncLocalLessonProgressToDatabase } from './src/lessonProgressService.js';
   await syncLocalLessonProgressToDatabase();
   ```
3. Check Supabase Dashboard → `lesson_progress` table for your user's row

### Issue: RLS policy preventing read/write

**Check Supabase logs:**
1. Supabase Dashboard → **Logs** → **Auth logs**
2. Look for "policy violation" errors
3. Verify `user_id` in payload matches `auth.uid()`

---

## Next Steps

1. ✓ Run the migration SQL
2. ✓ Seed courses/lessons data
3. ✓ Test guest → signup flow
4. ✓ Verify Supabase tables populate
5. ✓ Deploy to production
6. (Optional) Set up guest session tracking
7. (Optional) Add more user profile fields (bio, preferences, etc.)

---

## Useful SQL Queries

**See all courses:**
```sql
SELECT id, title, category, level FROM courses;
```

**See all lessons for a course:**
```sql
SELECT id, title, order_index FROM lessons WHERE course_id = 1;
```

**See specific user's progress:**
```sql
SELECT l.title, lp.furthest_position_seconds, lp.is_completed
FROM lesson_progress lp
JOIN lessons l ON lp.lesson_id = l.id
WHERE lp.user_id = 'YOUR_USER_UUID'
ORDER BY lp.updated_at DESC;
```

**See specific user's bookmarks:**
```sql
SELECT c.title, c.rating, fav.created_at
FROM favorite_courses fav
JOIN courses c ON fav.course_id = c.id
WHERE fav.user_id = 'YOUR_USER_UUID'
ORDER BY fav.created_at DESC;
```

**Delete guest session (older than 30 days):**
```sql
DELETE FROM guest_sessions WHERE expires_at < NOW();
```

---

**Questions?** Check `src/authService.js`, `src/lessonProgressService.js`, `src/utils/favoriteCourses.js` for implementation details.
