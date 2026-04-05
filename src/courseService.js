import { supabase } from "./supabaseClient";
import { placeholderCourses } from "./placeholderCourses";

/**
 * Fetch all courses from the database
 * @returns {Promise<Array>} Array of course objects
 */
export async function fetchCourses() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        *,
        category:categories(name, slug),
        lessons(id, duration_seconds)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      console.warn("Using placeholder courses as fallback");
      return placeholderCourses;
    }

    // If no courses in database, use placeholders
    if (!data || data.length === 0) {
      console.warn("No courses found in database, using placeholders");
      return placeholderCourses;
    }

    return data || [];
  } catch (err) {
    console.error("Error in fetchCourses:", err);
    console.warn("Using placeholder courses as fallback");
    return placeholderCourses;
  }
}

/**
 * Fetch featured courses (limit to 3 for homepage)
 * @returns {Promise<Array>} Array of featured course objects
 */
export async function fetchFeaturedCourses(limit = 3) {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        *,
        category:categories(name, slug),
        lessons(id, duration_seconds)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching featured courses:", error);
      console.warn("Using placeholder courses as fallback");
      return placeholderCourses.slice(0, limit);
    }

    // If no courses in database, use placeholders
    if (!data || data.length === 0) {
      console.warn("No courses found in database, using placeholders");
      return placeholderCourses.slice(0, limit);
    }

    return data || [];
  } catch (err) {
    console.error("Error in fetchFeaturedCourses:", err);
    console.warn("Using placeholder courses as fallback");
    return placeholderCourses.slice(0, limit);
  }
}


/**
 * Fetch a single course by ID
 * @param {number} courseId - Course ID
 * @returns {Promise<Object|null>} Course object or null
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
 * Map database course to CourseCard props
 * @param {Object} course - Course from database
 * @returns {Object} Props for CourseCard component
 */
export function mapCourseToCardProps(course) {
  if (!course) return null;

  // Count lessons
  const lessonsCount = course.lessons?.length || 0;

  // Calculate duration from lessons (convert seconds to readable format)
  let duration = "";
  if (course.lessons && course.lessons.length > 0) {
    const totalSeconds = course.lessons.reduce(
      (sum, lesson) => sum + (lesson.duration_seconds || 0),
      0,
    );
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      duration = `${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
      if (minutes > 0) {
        duration += ` و${minutes} دقيقة`;
      }
    } else if (minutes > 0) {
      duration = `${minutes} دقيقة`;
    } else {
      duration = "أقل من دقيقة";
    }
  }

  return {
    id: course.id,
    title: course.title || "دورة بدون عنوان",
    instructor: extractInstructor(course.description),
    description: cleanDescription(course.description) || "",
    duration: duration || "غير محدد",
    lessonsCount: lessonsCount,
    level: mapDifficultyToArabic(course.difficulty),
    category: course.category?.name || course.course_type || "عام",
    thumbnail: course.thumbnail_url || null,
    isFeatured: true, // All courses shown as featured for now
  };
}

/**
 * Extract instructor name from description
 * Looks for patterns like "بواسطة: Name" or "المدرس: Name"
 */
function extractInstructor(description) {
  if (!description) return null;

  // Try to extract instructor from description
  const patterns = [
    /بواسطة[:\s]+([^\n.،]+)/,
    /المدرس[:\s]+([^\n.،]+)/,
    /الأستاذ[:\s]+([^\n.،]+)/,
    /الشيخ[:\s]+([^\n.،]+)/,
    /الدكتور[:\s]+([^\n.،]+)/,
    /د\.[:\s]+([^\n.،]+)/,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Clean description (remove instructor line if exists)
 */
function cleanDescription(description) {
  if (!description) return "";

  // Remove instructor line
  let cleaned = description
    .replace(/بواسطة[:\s]+[^\n.،]+/, "")
    .replace(/المدرس[:\s]+[^\n.،]+/, "")
    .replace(/الأستاذ[:\s]+[^\n.،]+/, "")
    .replace(/الشيخ[:\s]+[^\n.،]+/, "")
    .replace(/الدكتور[:\s]+[^\n.،]+/, "")
    .trim();

  return cleaned;
}

/**
 * Map difficulty level to Arabic
 */
function mapDifficultyToArabic(difficulty) {
  if (!difficulty) return "للجميع";

  const difficultyMap = {
    beginner: "للمبتدئين",
    intermediate: "متوسط",
    advanced: "متقدم",
    all: "للجميع",
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب",
  };

  return difficultyMap[difficulty.toLowerCase()] || difficulty;
}

/**
 * Get YouTube thumbnail from playlist ID
 * @param {string} playlistId - YouTube playlist ID
 * @returns {string} Thumbnail URL
 */
export function getYouTubeThumbnail(playlistId) {
  if (!playlistId) return null;

  // Try to get high quality thumbnail
  return `https://img.youtube.com/vi/${playlistId}/maxresdefault.jpg`;
}
