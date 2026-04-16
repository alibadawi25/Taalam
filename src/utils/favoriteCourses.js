import { supabase } from "../supabaseClient";

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

async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

function normalizeRemoteCourseId(courseId) {
  const parsed = Number(courseId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function fetchFavoriteCourseIdsForCurrentUser() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("favorite_courses")
    .select("course_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Unable to read favorite courses from Supabase", error);
    return null;
  }

  return new Set(
    (data || [])
      .map((row) => normalizeCourseId(row.course_id))
      .filter(Boolean),
  );
}

export async function setFavoriteCourseStateForCurrentUser(courseId, isFavorite) {
  const userId = await getCurrentUserId();
  const normalizedCourseId = normalizeRemoteCourseId(courseId);

  if (!userId || !normalizedCourseId) {
    return null;
  }

  if (isFavorite) {
    const { error } = await supabase
      .from("favorite_courses")
      .upsert(
        {
          user_id: userId,
          course_id: normalizedCourseId,
        },
        { onConflict: "user_id,course_id" },
      );

    if (error) {
      console.warn("Unable to save favorite course in Supabase", error);
      return null;
    }
  } else {
    const { error } = await supabase
      .from("favorite_courses")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", normalizedCourseId);

    if (error) {
      console.warn("Unable to remove favorite course from Supabase", error);
      return null;
    }
  }

  return fetchFavoriteCourseIdsForCurrentUser();
}

export async function syncLocalFavoriteCoursesToDatabase(
  favoriteCourseIds = readFavoriteCourseIds(),
) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return false;
  }

  const rows = Array.from(favoriteCourseIds || [])
    .map((courseId) => normalizeRemoteCourseId(courseId))
    .filter(Boolean)
    .map((courseId) => ({
      user_id: userId,
      course_id: courseId,
    }));

  if (rows.length === 0) {
    return true;
  }

  const { error } = await supabase
    .from("favorite_courses")
    .upsert(rows, { onConflict: "user_id,course_id" });

  if (error) {
    console.warn("Unable to sync favorite courses to Supabase", error);
    return false;
  }

  return true;
}
