import { supabase } from "./supabaseClient";
import { placeholderCourses } from "./placeholderCourses";

/**
 * Fetch all courses from the database.
 * Falls back to placeholders when Supabase is unavailable.
 */
export async function fetchCourses() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        *,
        category:categories(name, slug),
        lessons(id, title, order_index, duration_seconds)
      `,
      )
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      console.warn("Using placeholder courses as fallback", error);
      return placeholderCourses;
    }

    return data;
  } catch (err) {
    console.error("Error in fetchCourses:", err);
    return placeholderCourses;
  }
}

/**
 * Fetch featured courses.
 */
export async function fetchFeaturedCourses(limit = 3) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        *,
        category:categories(name, slug),
        lessons(id, title, order_index, duration_seconds)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      console.warn("Using placeholder featured courses as fallback", error);
      return placeholderCourses.slice(0, limit);
    }

    return data;
  } catch (err) {
    console.error("Error in fetchFeaturedCourses:", err);
    return placeholderCourses.slice(0, limit);
  }
}

/**
 * Fetch a single course by ID.
 */
export async function fetchCourseById(courseId) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        *,
        category:categories(name, slug),
        lessons(*)
      `,
      )
      .eq("id", courseId)
      .single();

    if (error) {
      console.error("Error fetching course:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Error in fetchCourseById:", err);
    return null;
  }
}

/**
 * Map a raw course object into UI-ready props.
 */
export function mapCourseToCardProps(course) {
  if (!course) return null;

  const lessonsCount = course.lessons?.length || course.lessonsCount || 0;
  const duration = computeDurationLabel(course, lessonsCount);
  const instructor =
    course.instructor ||
    course.teacher_name ||
    extractInstructor(course.description) ||
    "فريق تعلّم";

  return {
    id: course.id,
    title: course.title || "دورة بدون عنوان",
    instructor,
    instructorAvatar: course.instructor_avatar || null,
    description: cleanDescription(course.description) || "",
    duration,
    lessonsCount,
    level: mapDifficultyToArabic(course.difficulty || course.level),
    category: course.category?.name || course.course_type || course.category || "عام",
    thumbnail: course.thumbnail_url || course.thumbnail || null,
    isFeatured: Boolean(course.is_featured ?? course.isFeatured ?? false),
    progress: normalizeProgress(course.progress ?? course.user_progress ?? 0),
    rating: normalizeRating(course.rating, course.id),
  };
}

function computeDurationLabel(course, lessonsCount) {
  if (course.duration) {
    return course.duration;
  }

  if (!course.lessons || course.lessons.length === 0) {
    return lessonsCount > 0 ? `${lessonsCount} درس` : "غير محدد";
  }

  const totalSeconds = course.lessons.reduce(
    (sum, lesson) => sum + (lesson.duration_seconds || 0),
    0,
  );

  if (totalSeconds <= 0) {
    return "غير محدد";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} س ${minutes} د`;
  }

  if (hours > 0) {
    return `${hours} ساعة`;
  }

  return `${Math.max(1, minutes)} دقيقة`;
}

function extractInstructor(description = "") {
  const patterns = [
    /بواسطة[:\s]+([^\n.،]+)/,
    /المدرس[:\s]+([^\n.،]+)/,
    /الأستاذ[:\s]+([^\n.،]+)/,
    /الشيخ[:\s]+([^\n.،]+)/,
    /الدكتور[:\s]+([^\n.،]+)/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function cleanDescription(description = "") {
  return description
    .replace(/بواسطة[:\s]+[^\n.،]+/, "")
    .replace(/المدرس[:\s]+[^\n.،]+/, "")
    .replace(/الأستاذ[:\s]+[^\n.،]+/, "")
    .replace(/الشيخ[:\s]+[^\n.،]+/, "")
    .replace(/الدكتور[:\s]+[^\n.،]+/, "")
    .trim();
}

function mapDifficultyToArabic(difficulty) {
  if (!difficulty) return "للجميع";

  const value = String(difficulty).toLowerCase();
  const difficultyMap = {
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
    all: "للجميع",
    easy: "سهل",
    medium: "متوسط",
    hard: "متقدم",
  };

  return difficultyMap[value] || String(difficulty);
}

function normalizeProgress(progressValue) {
  const parsed = Number(progressValue);
  if (Number.isNaN(parsed)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function normalizeRating(ratingValue, id = 1) {
  const parsed = Number(ratingValue);
  if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 5) {
    return Number(parsed.toFixed(1));
  }

  const seed = Number(id) || 1;
  const generated = 4 + ((seed % 7) / 10);
  return Number(Math.min(4.9, generated).toFixed(1));
}

export function getYouTubeThumbnail(videoId) {
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
