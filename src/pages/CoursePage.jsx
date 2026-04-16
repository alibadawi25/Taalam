import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BookOpenText,
  CheckCircle,
  Clock,
  DeviceMobile,
  Heart,
  Infinity as InfinityIcon,
  PlayCircle,
  ShareNetwork,
  Star,
} from "@phosphor-icons/react";
import Header from "../components/Header";
import { fetchCourseById, mapCourseToCardProps } from "../courseService";
import { getCategoryMeta } from "../constants/categoryMeta";
import { useFavoriteCourses } from "../hooks/useFavoriteCourses";
import { useAuth } from "../hooks/useAuth";
import {
  computeCourseProgressPercent,
  fetchLessonProgressByLessonIds,
  isLessonCompleted,
} from "../lessonProgressService";
import "./CoursePage.css";

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

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <span className="cp-stars" aria-label={`تقييم ${rating} من 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = index < full || (hasHalf && index === full);
        return (
          <Star
            key={index}
            weight={filled ? "fill" : "regular"}
            aria-hidden="true"
            className={filled ? "cp-star--filled" : "cp-star--empty"}
          />
        );
      })}
      <span className="cp-stars-value">{rating.toFixed(1)}</span>
    </span>
  );
}

function SkeletonBlock({ className }) {
  return <div className={`cp-skeleton ${className || ""}`} aria-hidden="true" />;
}

function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { favoriteCourseIds, toggleFavoriteCourse } = useFavoriteCourses();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lessonProgressById, setLessonProgressById] = useState({});
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const isFavorite = favoriteCourseIds.has(String(course?.id));

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

    void loadCourse();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const displayLessons = useMemo(() => {
    if (!course) return [];
    if (course.lessons && course.lessons.length > 0) {
      return [...course.lessons].sort((a, b) => {
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
    if (course.lessonsCount > 0) {
      return Array.from({ length: course.lessonsCount }, (_, index) => ({
        id: `placeholder-${index}`,
        title: null,
        duration_seconds: null,
      }));
    }
    return [];
  }, [course]);

  const categoryMeta = useMemo(
    () => getCategoryMeta(course?.category || ""),
    [course?.category],
  );
  const CategoryIcon = categoryMeta.Icon;

  const firstRealLesson = useMemo(
    () =>
      displayLessons.find(
        (lesson) => lesson?.id && !String(lesson.id).startsWith("placeholder-"),
      ) || null,
    [displayLessons],
  );

  useEffect(() => {
    const lessonIds = displayLessons
      .map((lesson) => Number(lesson?.id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (lessonIds.length === 0) {
      setLessonProgressById({});
      return;
    }

    let cancelled = false;

    async function loadLessonProgress() {
      const progressMap = await fetchLessonProgressByLessonIds(lessonIds);
      if (!cancelled) {
        setLessonProgressById(progressMap);
      }
    }

    void loadLessonProgress();

    return () => {
      cancelled = true;
    };
  }, [displayLessons]);

  const derivedCourseProgress = useMemo(() => {
    const computed = computeCourseProgressPercent(displayLessons, lessonProgressById);
    if (typeof computed === "number") return computed;
    return course?.progress ?? 0;
  }, [displayLessons, lessonProgressById, course?.progress]);

  const ctaLabel = useMemo(() => {
    if (!course || derivedCourseProgress === 0) return "ابدأ الدورة الآن";
    if (derivedCourseProgress === 100) return "إعادة المشاهدة";
    return "متابعة التعلّم";
  }, [course, derivedCourseProgress]);

  const showToast = useCallback((message, tone = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const handleToggleFavorite = useCallback(() => {
    if (!course?.id) return;
    const nextWillBeFavorite = !isFavorite;
    void toggleFavoriteCourse(course.id);
    showToast(
      nextWillBeFavorite ? "أُضيفت إلى المفضلة" : "أُزيلت من المفضلة",
    );
  }, [course?.id, isFavorite, showToast, toggleFavoriteCourse]);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = course?.title || "دورة في تعلّم";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
        return;
      } catch {
        // User cancelled; fall through to clipboard copy.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("تم نسخ رابط الدورة");
        return;
      } catch {
        // Ignore and fall through to the error toast.
      }
    }

    showToast("تعذرت المشاركة", "error");
  }, [course?.title, showToast]);

  const handleStartLearning = useCallback(() => {
    if (course?.id && firstRealLesson?.id) {
      navigate(`/course/${course.id}/lesson/${firstRealLesson.id}`);
      return;
    }

    showToast("لا توجد دروس متاحة بعد", "error");
  }, [course?.id, firstRealLesson?.id, navigate, showToast]);

  if (loading) {
    return (
      <div className="cp-page" dir="rtl">
        <Header backHref="/home" />
        <section className="cp-hero">
          <SkeletonBlock className="cp-skeleton--hero" />
        </section>
        <section className="cp-header">
          <div className="cp-header-inner">
            <SkeletonBlock className="cp-skeleton--badge" />
            <SkeletonBlock className="cp-skeleton--title" />
            <SkeletonBlock className="cp-skeleton--line" />
            <SkeletonBlock className="cp-skeleton--line cp-skeleton--line-short" />
          </div>
        </section>
        <div className="cp-body">
          <aside className="cp-sidebar">
            <div className="cp-enroll-card">
              <SkeletonBlock className="cp-skeleton--btn" />
              <SkeletonBlock className="cp-skeleton--line" />
              <SkeletonBlock className="cp-skeleton--line" />
              <SkeletonBlock className="cp-skeleton--line" />
            </div>
          </aside>
          <div className="cp-main">
            <div className="cp-content-skeleton">
              <SkeletonBlock className="cp-skeleton--section-title" />
              <SkeletonBlock className="cp-skeleton--line" />
              <SkeletonBlock className="cp-skeleton--line" />
              <SkeletonBlock className="cp-skeleton--line cp-skeleton--line-short" />
              <SkeletonBlock className="cp-skeleton--section-title" />
              {[1, 2, 3, 4, 5].map((index) => (
                <SkeletonBlock key={index} className="cp-skeleton--lesson-row" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="cp-page" dir="rtl">
        <Header backHref="/home" />
        <div className="cp-empty-state">
          <p className="cp-empty-msg">
            {error
              ? "تعذر تحميل الدورة. يرجى المحاولة مجددًا."
              : "الدورة غير موجودة."}
          </p>
          <Link to="/home" className="cp-empty-link">
            العودة إلى المكتبة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-page" dir="rtl">
      <Header backHref="/home" />

      <section className="cp-hero cp-fade-in">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title || "صورة الدورة"}
            className="cp-hero-thumb"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <div className="cp-hero-placeholder" aria-hidden="true">
            <CategoryIcon weight="duotone" />
          </div>
        )}
      </section>

      <section className="cp-header cp-fade-in cp-fade-in--delay-1">
        <div className="cp-header-inner">
          <div className="cp-header-badges">
            <span
              className="cp-badge cp-badge--category"
              style={{ backgroundColor: categoryMeta.color }}
            >
              <CategoryIcon weight="duotone" aria-hidden="true" />
              {course.category}
            </span>
            <span className="cp-badge cp-badge--level">{course.level}</span>
            {course.isFeatured && (
              <span className="cp-badge cp-badge--featured">
                <Star weight="fill" aria-hidden="true" />
                مميزة
              </span>
            )}
          </div>

          <h1 className="cp-header-title">{course.title}</h1>

          <div className="cp-header-meta-row">
            <StarRating rating={course.rating} />
            <span className="cp-header-meta-divider" aria-hidden="true" />
            <span className="cp-header-meta-stat">
              <Clock weight="duotone" aria-hidden="true" />
              {course.duration}
            </span>
            <span className="cp-header-meta-divider" aria-hidden="true" />
            <span className="cp-header-meta-stat">
              <BookOpenText weight="duotone" aria-hidden="true" />
              {course.lessonsCount} درس
            </span>
          </div>

          <div className="cp-header-bottom-row">
            <div className="cp-header-actions">
              <button
                type="button"
                className={`cp-icon-btn ${isFavorite ? "is-active" : ""}`}
                onClick={handleToggleFavorite}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? "إزالة من المفضلة" : "أضف للمفضلة"}
              >
                <Heart weight={isFavorite ? "fill" : "duotone"} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cp-icon-btn"
                onClick={handleShare}
                aria-label="مشاركة الدورة"
              >
                <ShareNetwork weight="duotone" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="cp-body">
        <aside className="cp-sidebar">
          <div className="cp-enroll-card cp-fade-in cp-fade-in--delay-2">
            <span className="cp-enroll-label">ابدأ التعلّم الآن</span>

            {derivedCourseProgress > 0 && (
              <div className="cp-progress-wrap">
                <div className="cp-progress-header">
                  <span className="cp-progress-label">تقدمك</span>
                  <span className="cp-progress-pct">{derivedCourseProgress}%</span>
                </div>
                <div
                  className="cp-progress-track"
                  role="progressbar"
                  aria-valuenow={derivedCourseProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div
                    className="cp-progress-fill"
                    style={{ width: `${derivedCourseProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button type="button" className="cp-cta-btn" onClick={handleStartLearning}>
              <PlayCircle weight="fill" aria-hidden="true" />
              {ctaLabel}
            </button>

            <div className="cp-divider" />

            <span className="cp-includes-title">ما تحصل عليه</span>
            <ul className="cp-includes-list">
              <li className="cp-includes-item">
                <Clock weight="duotone" aria-hidden="true" />
                <span>{course.duration} من المحتوى</span>
              </li>
              <li className="cp-includes-item">
                <BookOpenText weight="duotone" aria-hidden="true" />
                <span>{course.lessonsCount} درس قابل للمشاهدة</span>
              </li>
              <li className="cp-includes-item">
                <DeviceMobile weight="duotone" aria-hidden="true" />
                <span>متاح على الجوال والحاسوب</span>
              </li>
              <li className="cp-includes-item">
                <InfinityIcon weight="duotone" aria-hidden="true" />
                <span>وصول مدى الحياة</span>
              </li>
            </ul>

            {!isAuthenticated && (
              <>
                <div className="cp-divider" />
                <div className="cp-auth-note">
                  <span className="cp-auth-note-title">احفظ تقدمك في الحساب</span>
                  <p className="cp-auth-note-text">
                    سجّل الدخول ليتم حفظ الدروس المكتملة والمفضلة داخل قاعدة البيانات.
                  </p>
                  <Link to="/auth" className="cp-auth-note-link">
                    تسجيل الدخول أو إنشاء حساب
                  </Link>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="cp-main">
          {course.description && (
            <section className="cp-section cp-fade-in cp-fade-in--delay-2" id="about">
              <h2 className="cp-section-title">عن الدورة</h2>
              <p className="cp-description">{course.description}</p>
            </section>
          )}

          {displayLessons.length > 0 && (
            <section className="cp-section cp-fade-in cp-fade-in--delay-3" id="curriculum">
              <header className="cp-section-header">
                <h2 className="cp-section-title">محتوى الدورة</h2>
                <span className="cp-section-meta">
                  {displayLessons.length} درس · {course.duration}
                </span>
              </header>
              <ol className="cp-lessons-list">
                {displayLessons.map((lesson, index) => {
                  const duration = formatSeconds(lesson.duration_seconds);
                  const title = lesson.title || `الدرس ${index + 1}`;
                  const lessonProgress = lessonProgressById[Number(lesson.id)];
                  const lessonHref =
                    lesson?.id && !String(lesson.id).startsWith("placeholder-")
                      ? `/course/${course.id}/lesson/${lesson.id}`
                      : null;
                  const completedFromProgress = lessonProgress
                    ? isLessonCompleted(lesson, lessonProgress)
                    : derivedCourseProgress > 0 &&
                      index < Math.floor((derivedCourseProgress / 100) * displayLessons.length);

                  return (
                    <li
                      key={lesson.id || index}
                      className={`cp-lesson-row ${completedFromProgress ? "is-completed" : ""} ${lessonHref ? "" : "is-disabled"}`}
                      role={lessonHref ? "button" : undefined}
                      tabIndex={lessonHref ? 0 : -1}
                      onClick={() => {
                        if (lessonHref) navigate(lessonHref);
                      }}
                      onKeyDown={(event) => {
                        if (!lessonHref) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(lessonHref);
                        }
                      }}
                    >
                      <span className="cp-lesson-num" aria-hidden="true">
                        {completedFromProgress ? <CheckCircle weight="fill" /> : index + 1}
                      </span>
                      <div className="cp-lesson-info">
                        <span className="cp-lesson-title">{title}</span>
                      </div>
                      {duration && (
                        <span className="cp-lesson-duration">
                          <span className="cp-lesson-duration-value">{duration}</span>
                          <Clock weight="duotone" aria-hidden="true" />
                        </span>
                      )}
                      <span className="cp-lesson-play" aria-hidden="true">
                        <PlayCircle weight="fill" />
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      </div>

      <div className="cp-mobile-bar" role="region" aria-label="شريط البدء">
        {derivedCourseProgress > 0 && (
          <div
            className="cp-mobile-bar-progress"
            role="progressbar"
            aria-valuenow={derivedCourseProgress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="cp-mobile-bar-progress-fill"
              style={{ width: `${derivedCourseProgress}%` }}
            />
          </div>
        )}
        <div className="cp-mobile-bar-inner">
          <div className="cp-mobile-bar-meta">
            <span className="cp-mobile-bar-meta-label">
              {derivedCourseProgress > 0 ? `${derivedCourseProgress}% مكتمل` : "ابدأ التعلّم"}
            </span>
            <span className="cp-mobile-bar-meta-sub">
              {course.lessonsCount} درس · {course.duration}
            </span>
          </div>
          <button type="button" className="cp-mobile-bar-cta" onClick={handleStartLearning}>
            <PlayCircle weight="fill" aria-hidden="true" />
            <span>{ctaLabel}</span>
          </button>
        </div>
      </div>

      <div
        className={`cp-toast ${toast ? "is-visible" : ""} ${toast?.tone === "error" ? "is-error" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast?.tone === "error" ? null : <CheckCircle weight="fill" aria-hidden="true" />}
        <span>{toast?.message}</span>
      </div>
    </div>
  );
}

export default CoursePage;
