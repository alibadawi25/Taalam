const FAVORITE_COURSES_STORAGE_KEY = "favorite_course_ids";

function normalizeCourseId(courseId) {
  if (courseId === null || courseId === undefined) {
    return null;
  }

  return String(courseId);
}

export function readFavoriteCourseIds() {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(FAVORITE_COURSES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed
        .map((value) => normalizeCourseId(value))
        .filter(Boolean),
    );
  } catch (error) {
    console.warn("Failed to read favorite courses from localStorage", error);
    return new Set();
  }
}

export function saveFavoriteCourseIds(favoriteCourseIds) {
  if (typeof window === "undefined") {
    return;
  }

  const values = Array.from(favoriteCourseIds || [])
    .map((value) => normalizeCourseId(value))
    .filter(Boolean);

  window.localStorage.setItem(FAVORITE_COURSES_STORAGE_KEY, JSON.stringify(values));
}

export function toggleFavoriteCourseId(currentFavoriteIds, courseId) {
  const normalizedCourseId = normalizeCourseId(courseId);
  if (!normalizedCourseId) {
    return new Set(currentFavoriteIds || []);
  }

  const nextFavoriteIds = new Set(currentFavoriteIds || []);

  if (nextFavoriteIds.has(normalizedCourseId)) {
    nextFavoriteIds.delete(normalizedCourseId);
  } else {
    nextFavoriteIds.add(normalizedCourseId);
  }

  return nextFavoriteIds;
}

export function isFavoriteCourse(favoriteCourseIds, courseId) {
  const normalizedCourseId = normalizeCourseId(courseId);
  if (!normalizedCourseId) {
    return false;
  }

  return Boolean(favoriteCourseIds?.has(normalizedCourseId));
}
