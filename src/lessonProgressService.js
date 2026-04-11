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

  const storedMap = readStoredProgressMap();
  const byLessonId = {};

  for (const lessonId of normalizedIds) {
    const row = normalizeStoredRow(lessonId, storedMap[lessonId]);
    if (!row) continue;

    const numericLessonId = Number(row.lesson_id);
    if (!Number.isFinite(numericLessonId) || numericLessonId <= 0) continue;

    const furthest = normalizeSeconds(
      row.furthest_position_seconds ?? row.last_position_seconds,
    );
    const last = normalizeSeconds(row.last_position_seconds);

    byLessonId[numericLessonId] = {
      id: row.id,
      lessonId: numericLessonId,
      lastPositionSeconds: last,
      furthestPositionSeconds: furthest,
      isCompleted: Boolean(row.is_completed),
      updatedAt: row.updated_at || null,
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
