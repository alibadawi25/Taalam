import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CaretLeft,
  CaretRight,
  Clock,
  PlayCircle,
} from "@phosphor-icons/react";
import Header from "../components/Header";
import LessonPlayer from "../components/LessonPlayer";
import LessonNotesPanel from "../components/LessonNotesPanel";
import { useAuth } from "../hooks/useAuth";
import {
  createNote,
  deleteNote,
  fetchNotesForLesson,
  updateNote,
} from "../notesService";
import { fetchCourseById, mapCourseToCardProps } from "../courseService";
import { getCategoryMeta } from "../constants/categoryMeta";
import {
  buildCourseProgressSnapshot,
  fetchLessonProgressByLessonIds,
  isLessonCompleted,
  upsertLessonProgress,
} from "../lessonProgressService";
import "./LessonPage.css";

function formatSeconds(seconds) {
  if (!seconds || seconds <= 0) return null;
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function extractYoutubeIdFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "") || null;
    }
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (embedIndex >= 0 && parts[embedIndex + 1]) {
      return parts[embedIndex + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function getYoutubeVideoId(lesson) {
  if (!lesson) return null;
  const direct =
    lesson.youtube_video_id ||
    lesson.youtubeVideoId ||
    lesson.video_id ||
    lesson.videoId ||
    null;
  if (direct) return String(direct);

  return (
    extractYoutubeIdFromUrl(lesson.source_url) ||
    extractYoutubeIdFromUrl(lesson.video_url) ||
    extractYoutubeIdFromUrl(lesson.youtube_url)
  );
}

function normalizeLessons(lessons = []) {
  return [...lessons].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.order_index))
      ? Number(a.order_index)
      : Number.MAX_SAFE_INTEGER;
    const orderB = Number.isFinite(Number(b.order_index))
      ? Number(b.order_index)
      : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function mapProgressRowToEntry(row, lessonIdFallback) {
  if (!row) return null;
  const lessonId = Number(row.lesson_id ?? lessonIdFallback);
  if (!Number.isFinite(lessonId) || lessonId <= 0) return null;

  const lastPosition = Math.max(0, Math.floor(Number(row.last_position_seconds) || 0));
  const furthestPosition = Math.max(
    lastPosition,
    Math.floor(
      Number(
        row.furthest_position_seconds ??
          row.furthestPositionSeconds ??
          row.last_position_seconds,
      ) || 0,
    ),
  );

  return {
    id: row.id ?? null,
    lessonId,
    lastPositionSeconds: lastPosition,
    furthestPositionSeconds: furthestPosition,
    isCompleted: Boolean(row.is_completed ?? row.isCompleted),
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function LessonPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lessonProgressById, setLessonProgressById] = useState({});
  const [currentPlaybackSeconds, setCurrentPlaybackSeconds] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaveError, setNoteSaveError] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [seekRequest, setSeekRequest] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);

    async function loadCourse() {
      if (!courseId) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      try {
        const raw = await fetchCourseById(courseId);
        if (!raw) {
          if (isMounted) setError(true);
          return;
        }

        const mapped = mapCourseToCardProps(raw);
        if (isMounted) {
          setCourse({ ...mapped, lessons: raw.lessons || [] });
        }
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCourse();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const lessons = useMemo(() => normalizeLessons(course?.lessons || []), [course?.lessons]);
  useEffect(() => {
    const lessonIds = lessons
      .map((lesson) => Number(lesson?.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (lessonIds.length === 0) {
      setLessonProgressById({});
      return;
    }

    let cancelled = false;
    async function loadProgress() {
      const progressMap = await fetchLessonProgressByLessonIds(lessonIds);
      if (!cancelled) {
        setLessonProgressById(progressMap);
      }
    }
    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [lessons]);

  const currentIndex = useMemo(
    () => lessons.findIndex((lesson) => String(lesson.id) === String(lessonId)),
    [lessons, lessonId],
  );

  useEffect(() => {
    if (loading || error || lessons.length === 0) return;
    if (currentIndex >= 0) return;

    const fallbackLesson = lessons[0];
    navigate(`/course/${courseId}/lesson/${fallbackLesson.id}`, { replace: true });
  }, [loading, error, lessons, currentIndex, courseId, navigate]);

  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentLesson = lessons[activeIndex] || null;
  const currentLessonId = Number(currentLesson?.id);
  const videoId = getYoutubeVideoId(currentLesson);
  const categoryMeta = getCategoryMeta(course?.category || "");

  const prevLesson = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const nextLesson = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;
  const currentLessonProgress = lessonProgressById[currentLessonId];
  const courseSnapshot = useMemo(
    () => buildCourseProgressSnapshot({ ...course, lessons }, lessonProgressById),
    [course, lessons, lessonProgressById],
  );

  useEffect(() => {
    const nextStartingPoint = Number(
      currentLessonProgress?.lastPositionSeconds ??
        currentLessonProgress?.furthestPositionSeconds ??
        0,
    );
    setCurrentPlaybackSeconds(Math.max(0, nextStartingPoint));
    setSeekRequest(null);
    setNoteDraft("");
    setNoteSaveError("");
  }, [
    currentLesson?.id,
    currentLessonProgress?.furthestPositionSeconds,
    currentLessonProgress?.lastPositionSeconds,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      if (!isAuthenticated || !Number.isFinite(currentLessonId) || currentLessonId <= 0) {
        setNotes([]);
        setNotesLoading(false);
        return;
      }

      setNotesLoading(true);
      try {
        const nextNotes = await fetchNotesForLesson(currentLessonId);
        if (!cancelled) {
          setNotes(nextNotes);
        }
      } catch (loadError) {
        console.error("Failed to load lesson notes", loadError);
        if (!cancelled) {
          setNotes([]);
        }
      } finally {
        if (!cancelled) {
          setNotesLoading(false);
        }
      }
    }

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [currentLessonId, isAuthenticated]);

  const persistLessonProgress = useCallback(
    async ({ currentSeconds, furthestSeconds, isCompleted }) => {
      if (!Number.isFinite(currentLessonId) || currentLessonId <= 0) return;

      const lastPositionSeconds = Math.max(
        0,
        Math.floor(Number(currentSeconds) || 0),
      );
      const incomingFurthest = Math.max(
        0,
        Math.floor(Number(furthestSeconds ?? currentSeconds) || 0),
      );
      const priorFurthest = Math.max(
        0,
        Math.floor(Number(currentLessonProgress?.furthestPositionSeconds) || 0),
      );
      const furthestPositionSeconds = Math.max(incomingFurthest, priorFurthest);

      const payload = {
        lastPositionSeconds,
        furthestPositionSeconds,
        isCompleted: Boolean(isCompleted),
      };

      const savedRow = await upsertLessonProgress(currentLessonId, payload);
      const mappedFromRow = mapProgressRowToEntry(savedRow, currentLessonId);
      const mappedFallback = {
        id: currentLessonProgress?.id ?? null,
        lessonId: currentLessonId,
        lastPositionSeconds,
        furthestPositionSeconds,
        isCompleted: payload.isCompleted || Boolean(currentLessonProgress?.isCompleted),
        updatedAt: new Date().toISOString(),
      };

      setLessonProgressById((previous) => ({
        ...previous,
        [currentLessonId]: mappedFromRow || mappedFallback,
      }));
    },
    [currentLessonId, currentLessonProgress],
  );

  const handleLessonComplete = useCallback(() => {
    const durationSeconds = Math.max(
      0,
      Math.floor(Number(currentLesson?.duration_seconds) || 0),
    );
    const priorFurthest = Math.max(
      0,
      Math.floor(Number(currentLessonProgress?.furthestPositionSeconds) || 0),
    );
    const completedSeconds = durationSeconds > 0 ? durationSeconds : priorFurthest;

    persistLessonProgress({
      currentSeconds: completedSeconds,
      furthestSeconds: completedSeconds,
      durationSeconds,
      isCompleted: true,
    });
  }, [
    currentLesson?.duration_seconds,
    currentLessonProgress?.furthestPositionSeconds,
    persistLessonProgress,
  ]);

  const handleCreateNote = useCallback(async () => {
    if (!isAuthenticated || !currentLessonId) {
      return;
    }

    setIsSavingNote(true);
    setNoteSaveError("");

    try {
      const savedNote = await createNote(currentLessonId, {
        content: noteDraft,
        timestampSeconds: currentPlaybackSeconds,
      });

      setNotes((previous) =>
        [savedNote, ...previous].sort((a, b) => {
          if (a.isStarred !== b.isStarred) {
            return Number(b.isStarred) - Number(a.isStarred);
          }

          if (a.timestampSeconds !== b.timestampSeconds) {
            return a.timestampSeconds - b.timestampSeconds;
          }

          return Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "");
        }),
      );
      setNoteDraft("");
    } catch (saveError) {
      console.error("Failed to save lesson note", saveError);
      setNoteSaveError("تعذر حفظ الملاحظة الآن. حاول مرة أخرى.");
    } finally {
      setIsSavingNote(false);
    }
  }, [currentLessonId, currentPlaybackSeconds, isAuthenticated, noteDraft]);

  const handleToggleNoteStar = useCallback(async (note) => {
    try {
      const updated = await updateNote(note.id, { isStarred: !note.isStarred });
      setNotes((previous) =>
        previous
          .map((entry) => (entry.id === updated.id ? updated : entry))
          .sort((a, b) => {
            if (a.isStarred !== b.isStarred) {
              return Number(b.isStarred) - Number(a.isStarred);
            }

            if (a.timestampSeconds !== b.timestampSeconds) {
              return a.timestampSeconds - b.timestampSeconds;
            }

            return Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "");
          }),
      );
    } catch (toggleError) {
      console.error("Failed to update note star state", toggleError);
      setNoteSaveError("تعذر تحديث الملاحظة الآن.");
    }
  }, []);

  const handleDeleteNote = useCallback(async (note) => {
    try {
      await deleteNote(note.id);
      setNotes((previous) => previous.filter((entry) => entry.id !== note.id));
    } catch (deleteError) {
      console.error("Failed to delete note", deleteError);
      setNoteSaveError("تعذر حذف الملاحظة الآن.");
    }
  }, []);

  const handleJumpToNote = useCallback((timestampSeconds) => {
    setSeekRequest({
      seconds: Math.max(0, Math.floor(Number(timestampSeconds) || 0)),
      autoPlay: true,
      nonce: Date.now(),
    });
    setCurrentPlaybackSeconds(Math.max(0, Math.floor(Number(timestampSeconds) || 0)));
  }, []);

  useEffect(() => {
    if (currentLesson?.id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentLesson?.id]);

  if (loading) {
    return (
      <div className="lp-page" dir="rtl">
        <Header backHref={`/course/${courseId || ""}`} />
        <div className="lp-empty">جاري تحميل الدرس...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="lp-page" dir="rtl">
        <Header backHref="/home" />
        <div className="lp-empty">
          <p>تعذّر تحميل بيانات الدروس.</p>
          <Link to={`/course/${courseId || ""}`} className="lp-link">
            العودة إلى صفحة الدورة
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="lp-page" dir="rtl">
        <Header backHref={`/course/${courseId}`} />
        <div className="lp-empty">
          <p>لا توجد دروس لهذه الدورة حالياً.</p>
          <Link to={`/course/${courseId}`} className="lp-link">
            العودة إلى صفحة الدورة
          </Link>
        </div>
      </div>
    );
  }

  const duration = formatSeconds(currentLesson.duration_seconds);
  const watchedSeconds = Number(
    currentLessonProgress?.furthestPositionSeconds ??
      currentLessonProgress?.lastPositionSeconds ??
      0,
  );
  const watchedDuration = watchedSeconds > 0 ? formatSeconds(watchedSeconds) : null;
  const watchedPercent =
    Number(currentLesson?.duration_seconds) > 0
      ? Math.min(
          100,
          Math.round((watchedSeconds / Number(currentLesson.duration_seconds)) * 100),
        )
      : null;

  return (
    <div className="lp-page" dir="rtl">
      <Header backHref={`/course/${courseId}`} />

      <main className="lp-layout">
        <section className="lp-main">
          <div className="lp-player-card">
            {videoId ? (
              <LessonPlayer
                key={currentLesson.id}
                videoId={videoId}
                lessonNumber={activeIndex + 1}
                lessonTitle={currentLesson.title || `الدرس ${activeIndex + 1}`}
                courseTitle={course?.title || ""}
                categoryMeta={categoryMeta}
                durationSeconds={Number(currentLesson.duration_seconds) || 0}
                initialFurthestSeconds={
                  Number(
                    currentLessonProgress?.lastPositionSeconds ??
                      currentLessonProgress?.furthestPositionSeconds ??
                      0,
                  ) || 0
                }
                seekRequest={seekRequest}
                hasNext={Boolean(nextLesson)}
                onNext={() =>
                  nextLesson && navigate(`/course/${courseId}/lesson/${nextLesson.id}`)
                }
                onProgress={persistLessonProgress}
                onComplete={handleLessonComplete}
                onTimeUpdate={setCurrentPlaybackSeconds}
              />
            ) : (
              <div className="lp-player-empty">
                <PlayCircle weight="duotone" aria-hidden="true" />
                <p>لا يوجد فيديو مضاف لهذا الدرس بعد.</p>
              </div>
            )}
          </div>

          <header className="lp-lesson-header">
            <span className="lp-lesson-kicker">الدرس {activeIndex + 1}</span>
            <h1 className="lp-lesson-title">
              {currentLesson.title || `الدرس ${activeIndex + 1}`}
            </h1>
            <div className="lp-lesson-meta">
              {duration ? (
                <span className="lp-meta-item">
                  <Clock weight="duotone" aria-hidden="true" />
                  {duration}
                </span>
              ) : null}
              {watchedDuration ? (
                <span className="lp-meta-item">
                  <PlayCircle weight="duotone" aria-hidden="true" />
                  شاهدت {watchedDuration}
                  {typeof watchedPercent === "number" ? ` (${watchedPercent}%)` : ""}
                </span>
              ) : null}
              {courseSnapshot.progressPercent > 0 ? (
                <span className="lp-meta-item">
                  <PlayCircle weight="duotone" aria-hidden="true" />
                  تقدمك في الدورة {courseSnapshot.progressPercent}%
                </span>
              ) : null}
            </div>
          </header>

          <div className="lp-nav-row">
            <button
              type="button"
              className="lp-nav-btn"
              disabled={!prevLesson}
              onClick={() =>
                prevLesson && navigate(`/course/${courseId}/lesson/${prevLesson.id}`)
              }
            >
              <CaretRight weight="bold" aria-hidden="true" />
              الدرس السابق
            </button>
            <button
              type="button"
              className="lp-nav-btn"
              disabled={!nextLesson}
              onClick={() =>
                nextLesson && navigate(`/course/${courseId}/lesson/${nextLesson.id}`)
              }
            >
              الدرس التالي
              <CaretLeft weight="bold" aria-hidden="true" />
            </button>
          </div>

          <LessonNotesPanel
            isAuthenticated={isAuthenticated}
            currentTimestamp={currentPlaybackSeconds}
            draft={noteDraft}
            saveError={noteSaveError}
            isLoading={notesLoading}
            isSaving={isSavingNote}
            notes={notes}
            onDraftChange={(value) => {
              setNoteDraft(value);
              if (noteSaveError) {
                setNoteSaveError("");
              }
            }}
            onCreateNote={handleCreateNote}
            onJumpToNote={handleJumpToNote}
            onToggleStar={handleToggleNoteStar}
            onDeleteNote={handleDeleteNote}
            formatTime={formatSeconds}
          />
        </section>

        <aside className="lp-sidebar">
          <h2 className="lp-sidebar-title">دروس الدورة</h2>
          <ol className="lp-list">
            {lessons.map((lesson, idx) => {
              const itemDuration = formatSeconds(lesson.duration_seconds);
              const isActive = idx === activeIndex;
              const progressEntry = lessonProgressById[Number(lesson.id)];
              const isCompleted = isLessonCompleted(lesson, progressEntry);
              return (
                <li key={lesson.id} className="lp-list-item">
                  <button
                    type="button"
                    className={`lp-list-btn ${isActive ? "is-active" : ""} ${isCompleted ? "is-complete" : ""}`}
                    onClick={() => navigate(`/course/${courseId}/lesson/${lesson.id}`)}
                  >
                    <span className="lp-list-num">{idx + 1}</span>
                    <span className="lp-list-text">
                      <span className="lp-list-title">
                        {lesson.title || `الدرس ${idx + 1}`}
                      </span>
                      {itemDuration ? (
                        <span className="lp-list-duration">{itemDuration}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      </main>
    </div>
  );
}

export default LessonPage;
