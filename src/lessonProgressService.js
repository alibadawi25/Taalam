import { supabase } from "./supabaseClient";

function normalizeSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

const LESSON_PROGRESS_STORAGE_KEY = "taallam.lesson_progress.v1";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStoredProgressMap() {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStoredProgressMap(progressMap) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      LESSON_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressMap || {}),
    );
  } catch {
    // Ignore storage quota/private mode errors.
  }
}

function normalizeStoredRow(lessonId, row) {
  if (!row || typeof row !== "object") return null;

  const numericLessonId = Number(lessonId ?? row.lesson_id);
  if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) return null;

  const lastPosition = normalizeSeconds(
    row.last_position_seconds ?? row.lastPositionSeconds,
  );
  const furthestPosition = Math.max(
    lastPosition,
    normalizeSeconds(
      row.furthest_position_seconds ?? row.furthestPositionSeconds ?? lastPosition,
    ),
  );

  return {
    id: Number(row.id) || numericLessonId,
    lesson_id: numericLessonId,
    last_position_seconds: lastPosition,
    furthest_position_seconds: furthestPosition,
    is_completed: Boolean(row.is_completed ?? row.isCompleted),
    updated_at: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user?.id ?? null;
}

function mapRowToProgressEntry(row) {
  if (!row) return null;

  const lessonId = Number(row.lesson_id);
  if (!Number.isFinite(lessonId) || lessonId <= 0) return null;

  return {
    id: row.id ?? null,
    lessonId,
    lastPositionSeconds: normalizeSeconds(row.last_position_seconds),
    furthestPositionSeconds: normalizeSeconds(
      row.furthest_position_seconds ?? row.last_position_seconds,
    ),
    isCompleted: Boolean(row.is_completed),
    updatedAt: row.updated_at || null,
  };
}

export async function fetchLessonProgressByLessonIds(lessonIds = []) {
  const normalizedIds = Array.from(
    new Set(
      lessonIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  if (normalizedIds.length === 0) {
    return {};
  }

  const byLessonId = {};

  const userId = await getCurrentUserId();
  if (userId) {
    try {
      const query = supabase
        .from("lesson_progress")
        .select(
          "id, lesson_id, last_position_seconds, furthest_position_seconds, is_completed, updated_at",
        )
        .eq("user_id", userId)
        .in("lesson_id", normalizedIds);

      const { data, error } = await query;

      if (!error && data) {
        for (const row of data) {
          const mapped = mapRowToProgressEntry(row);
          if (!mapped) continue;

          byLessonId[mapped.lessonId] = mapped;
        }
      } else if (error) {
        console.warn("Unable to read lesson progress from Supabase", error);
      }
    } catch (error) {
      console.warn("Supabase lesson progress lookup failed", error);
    }
  }

  const storedMap = readStoredProgressMap();

  for (const lessonId of normalizedIds) {
    const row = normalizeStoredRow(lessonId, storedMap[lessonId]);
    if (!row) continue;

    const numericLessonId = Number(row.lesson_id);
    if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) continue;

    const furthest = normalizeSeconds(
      row.furthest_position_seconds ?? row.last_position_seconds,
    );
    const last = normalizeSeconds(row.last_position_seconds);

    const existing = byLessonId[numericLessonId];

    byLessonId[numericLessonId] = {
      id: existing?.id ?? row.id,
      lessonId: numericLessonId,
      lastPositionSeconds: Math.max(existing?.lastPositionSeconds ?? 0, last),
      furthestPositionSeconds: Math.max(
        existing?.furthestPositionSeconds ?? 0,
        furthest,
      ),
      isCompleted: Boolean(existing?.isCompleted) || Boolean(row.is_completed),
      updatedAt: existing?.updatedAt || row.updated_at || null,
    };
  }

  return byLessonId;
}

export function computeCourseProgressPercent(lessons = [], progressByLessonId = {}) {
  const realLessons = lessons.filter((lesson) => {
    const id = Number(lesson?.id);
    return Number.isFinite(id) && id > 0;
  });

  if (realLessons.length === 0) return null;

  const lessonsWithDuration = realLessons.filter(
    (lesson) => Number(lesson.duration_seconds) > 0,
  );

  if (lessonsWithDuration.length > 0) {
    let totalDuration = 0;
    let watchedDuration = 0;

    for (const lesson of lessonsWithDuration) {
      const lessonId = Number(lesson.id);
      const duration = Math.max(0, Number(lesson.duration_seconds) || 0);
      const progress = progressByLessonId[lessonId];
      const watched = Math.min(
        duration,
        normalizeSeconds(progress?.furthestPositionSeconds ?? 0),
      );
      totalDuration += duration;
      watchedDuration += watched;
    }

    if (totalDuration <= 0) return null;
    return Math.round((watchedDuration / totalDuration) * 100);
  }

  let completed = 0;
  for (const lesson of realLessons) {
    const lessonId = Number(lesson.id);
    const progress = progressByLessonId[lessonId];
    if (progress?.isCompleted) completed += 1;
  }
  return Math.round((completed / realLessons.length) * 100);
}

export function isLessonCompleted(lesson, progressEntry) {
  if (!lesson) return false;
  if (progressEntry?.isCompleted) return true;

  const duration = Number(lesson.duration_seconds);
  if (!Number.isFinite(duration) || duration <= 0) return false;

  const furthest = normalizeSeconds(progressEntry?.furthestPositionSeconds ?? 0);
  return furthest >= Math.max(1, duration - 3);
}

export async function upsertLessonProgress(lessonId, payload) {
  const numericLessonId = Number(lessonId);
  if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) return null;

  const lastPosition = normalizeSeconds(payload?.lastPositionSeconds);
  const incomingFurthest = normalizeSeconds(payload?.furthestPositionSeconds);
  const incomingCompleted = Boolean(payload?.isCompleted);
  const userId = await getCurrentUserId();

  if (userId) {
    const existingRows = await fetchLessonProgressByLessonIds([numericLessonId]);
    const existing = existingRows[numericLessonId];

    const nextFurthest = Math.max(
      incomingFurthest,
      normalizeSeconds(existing?.furthestPositionSeconds),
    );
    const nextCompleted = Boolean(existing?.isCompleted) || incomingCompleted;

    const { data, error } = await supabase
      .from("lesson_progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: numericLessonId,
          last_position_seconds: lastPosition,
          furthest_position_seconds: nextFurthest,
          is_completed: nextCompleted,
        },
        { onConflict: "user_id,lesson_id" },
      )
      .select(
        "id, lesson_id, last_position_seconds, furthest_position_seconds, is_completed, updated_at",
      )
      .single();

    if (!error && data) {
      return data;
    }

    if (error) {
      console.warn("Unable to save lesson progress in Supabase", {
        userId,
        lessonId: numericLessonId,
        error,
      });
    }
  }

  const storedMap = readStoredProgressMap();
  const existing = normalizeStoredRow(numericLessonId, storedMap[numericLessonId]);

  const nextFurthest = Math.max(
    incomingFurthest,
    normalizeSeconds(existing?.furthest_position_seconds),
  );
  const nextCompleted = Boolean(existing?.is_completed) || incomingCompleted;

  const row = {
    id: Number(existing?.id) || numericLessonId,
    lesson_id: numericLessonId,
    last_position_seconds: lastPosition,
    furthest_position_seconds: nextFurthest,
    is_completed: nextCompleted,
    updated_at: new Date().toISOString(),
  };

  storedMap[numericLessonId] = row;
  writeStoredProgressMap(storedMap);
  return row;
}

export function getLocalProgressStats() {
  const storedMap = readStoredProgressMap();
  const entries = Object.values(storedMap);

  let totalSeconds = 0;
  let completedCount = 0;

  for (const entry of entries) {
    const furthest = normalizeSeconds(
      entry?.furthest_position_seconds ?? entry?.furthestPositionSeconds ?? 0,
    );
    totalSeconds += furthest;
    if (entry?.is_completed || entry?.isCompleted) {
      completedCount += 1;
    }
  }

  return {
    totalLessonsWithProgress: entries.length,
    completedLessonsCount: completedCount,
    totalLearningSeconds: totalSeconds,
    totalLearningHours: Math.floor(totalSeconds / 3600),
  };
}

export async function syncLocalLessonProgressToDatabase() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return false;
  }

  const storedMap = readStoredProgressMap();
  const rows = Object.entries(storedMap)
    .map(([lessonId, row]) => normalizeStoredRow(lessonId, row))
    .filter(Boolean)
    .map((row) => ({
      user_id: userId,
      lesson_id: row.lesson_id,
      last_position_seconds: normalizeSeconds(row.last_position_seconds),
      furthest_position_seconds: normalizeSeconds(row.furthest_position_seconds),
      is_completed: Boolean(row.is_completed),
    }));

  if (rows.length === 0) {
    return true;
  }

  const lessonIds = rows.map((row) => row.lesson_id);
  const { data: existingRows, error: existingError } = await supabase
    .from("lesson_progress")
    .select(
      "lesson_id, last_position_seconds, furthest_position_seconds, is_completed",
    )
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (existingError) {
    console.warn("Unable to read existing lesson progress before sync", existingError);
    return false;
  }

  const existingByLessonId = Object.fromEntries(
    (existingRows || []).map((row) => [Number(row.lesson_id), row]),
  );

  const mergedRows = rows.map((row) => {
    const existing = existingByLessonId[Number(row.lesson_id)];

    return {
      ...row,
      last_position_seconds: Math.max(
        normalizeSeconds(existing?.last_position_seconds),
        row.last_position_seconds,
      ),
      furthest_position_seconds: Math.max(
        normalizeSeconds(existing?.furthest_position_seconds),
        row.furthest_position_seconds,
      ),
      is_completed: Boolean(existing?.is_completed) || row.is_completed,
    };
  });

  const { error } = await supabase
    .from("lesson_progress")
    .upsert(mergedRows, { onConflict: "user_id,lesson_id" });

  if (error) {
    console.warn("Unable to sync lesson progress to Supabase", error);
    return false;
  }

  return true;
}
