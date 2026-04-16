import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  Clock,
  Heart,
  PencilSimple,
  SignOut,
} from "@phosphor-icons/react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useFavoriteCourses } from "../hooks/useFavoriteCourses";
import Header from "../components/Header";
import { fetchCourses } from "../courseService";
import { updateProfile } from "../authService";
import {
  buildLearningStats,
  fetchLessonProgressByLessonIds,
} from "../lessonProgressService";
import { isEnglishDisplayName } from "../utils/displayName";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut, displayName } = useAuth();
  const { favoriteCourseIds } = useFavoriteCourses();
  const isEnglishName = isEnglishDisplayName(displayName);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
  });
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [progressByLessonId, setProgressByLessonId] = useState({});
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        fullName: profile.full_name || "",
        email: profile.email || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    let cancelled = false;

    async function loadLearningData() {
      try {
        setCoursesLoading(true);
        const data = await fetchCourses();
        const lessonIds = Array.from(
          new Set(
            (data || []).flatMap((course) =>
              (course?.lessons || [])
                .map((lesson) => Number(lesson?.id))
                .filter((id) => Number.isFinite(id) && id > 0),
            ),
          ),
        );
        const nextProgressByLessonId =
          lessonIds.length > 0 ? await fetchLessonProgressByLessonIds(lessonIds) : {};

        if (!cancelled) {
          setCourses(data || []);
          setProgressByLessonId(nextProgressByLessonId);
        }
      } catch (loadError) {
        console.error("Failed to load profile learning data", loadError);
        if (!cancelled) {
          setCourses([]);
          setProgressByLessonId({});
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      }
    }

    if (user?.id) {
      void loadLearningData();
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const learningStats = useMemo(
    () => buildLearningStats(courses, progressByLessonId),
    [courses, progressByLessonId],
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
    }
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSaveProfile() {
    if (!user?.id) return;
    setIsSaving(true);
    setSaveError("");
    try {
      await updateProfile(user.id, { fullName: editForm.fullName.trim() });
      setIsEditing(false);
    } catch (error) {
      setSaveError("تعذر حفظ التغييرات. حاول مرة أخرى.");
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="profile-page" dir="rtl">
        <Header backHref="/home" backLabel="الدورات" />
        <main className="profile-loading">
          <div className="profile-loading-spinner" />
        </main>
      </div>
    );
  }

  const favoriteCourseObjects = courses
    .filter((course) => favoriteCourseIds.has(String(course.id)))
    .slice(0, 3);

  return (
    <div className="profile-page" dir="rtl">
      <Header backHref="/home" backLabel="الدورات" pageTitle="ملفك الشخصي" />

      <main className="profile-shell">
        <section className="profile-hero">
          <div className="profile-hero-bg" aria-hidden="true" />

          <div className="profile-hero-content">
            <div className="profile-avatar-zone">
              <div className="profile-avatar">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} />
                ) : (
                  <div className="profile-avatar-fallback">{displayName.charAt(0)}</div>
                )}
              </div>

              <div className="profile-greeting">
                <h1
                  className={`profile-name ${isEnglishName ? "profile-name--english" : ""}`}
                  dir={isEnglishName ? "ltr" : "rtl"}
                >
                  {displayName}
                </h1>
                <p className="profile-email">{profile?.email}</p>
              </div>
            </div>

            <div className="profile-hero-actions">
              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => setIsEditing(true)}
              >
                <PencilSimple weight="duotone" aria-hidden="true" />
                <span>تعديل الملف</span>
              </button>

              <button
                type="button"
                className="profile-signout-btn"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <SignOut weight="duotone" aria-hidden="true" />
                <span>{isSigningOut ? "جارٍ..." : "خروج"}</span>
              </button>
            </div>
          </div>

          <div className="profile-orbit profile-orbit--one" aria-hidden="true" />
          <div className="profile-orbit profile-orbit--two" aria-hidden="true" />
        </section>

        <section className="profile-stats">
          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--courses">
              <BookOpenText weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">دورات قيد الدراسة</span>
              <span className="profile-stat-value">
                {learningStats.inProgressCoursesCount}
              </span>
            </div>
          </article>

          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--completed">
              <CheckCircle weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">دورات مكتملة</span>
              <span className="profile-stat-value">
                {learningStats.completedCoursesCount}
              </span>
            </div>
          </article>

          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--time">
              <Clock weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">ساعات التعلّم</span>
              <span className="profile-stat-value">{learningStats.totalLearningHours}</span>
            </div>
          </article>
        </section>

        <div className="profile-grid">
          <section className="profile-card profile-card--info">
            <h2 className="profile-card-title">معلومات الملف</h2>

            {!isEditing ? (
              <div className="profile-info-display">
                <div className="profile-info-item">
                  <span className="profile-info-label">الاسم</span>
                  <span className="profile-info-value">
                    {profile?.full_name || "غير محدد"}
                  </span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">البريد الإلكتروني</span>
                  <span className="profile-info-value">{profile?.email}</span>
                </div>

                <div className="profile-info-item">
                  <span className="profile-info-label">تاريخ الانضمام</span>
                  <span className="profile-info-value">
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("ar-SA")
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <form className="profile-edit-form" onSubmit={(event) => event.preventDefault()}>
                <label className="profile-form-field">
                  <span>الاسم</span>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(event) => handleEditChange("fullName", event.target.value)}
                    placeholder="أدخل اسمك الكامل"
                  />
                </label>

                <label className="profile-form-field">
                  <span>البريد الإلكتروني</span>
                  <input
                    type="email"
                    value={editForm.email}
                    disabled
                    dir="ltr"
                    className="profile-form-field--disabled"
                  />
                  <small>لا يمكن تغيير البريد الإلكتروني</small>
                </label>

                {saveError ? <p className="profile-form-error">{saveError}</p> : null}

                <div className="profile-form-actions">
                  <button
                    type="button"
                    className="profile-form-save"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                  </button>
                  <button
                    type="button"
                    className="profile-form-cancel"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError("");
                    }}
                    disabled={isSaving}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="profile-card profile-card--favorites">
            <div className="profile-card-header">
              <h2 className="profile-card-title">الدورات المفضلة</h2>
              {favoriteCourseObjects.length > 0 && (
                <Heart weight="duotone" className="profile-card-icon" aria-hidden="true" />
              )}
            </div>

            {coursesLoading ? (
              <div className="profile-favorites-loading">جارٍ التحميل...</div>
            ) : favoriteCourseObjects.length > 0 ? (
              <div className="profile-favorites-list">
                {favoriteCourseObjects.map((course) => (
                  <Link key={course.id} to={`/course/${course.id}`} className="profile-favorite-item">
                    <span className="profile-favorite-name">{course.title}</span>
                    <ArrowRight weight="bold" className="profile-favorite-arrow" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="profile-empty-state">لم تختر أي دورات مفضلة بعد</p>
            )}
          </section>

          <section className="profile-card profile-card--activity">
            <h2 className="profile-card-title">آخر نشاط</h2>

            {coursesLoading ? (
              <div className="profile-favorites-loading">جارٍ التحميل...</div>
            ) : learningStats.recentActivity.length > 0 ? (
              <div className="profile-favorites-list">
                {learningStats.recentActivity.map((activity) => (
                  <Link
                    key={`${activity.courseId}-${activity.lessonId}`}
                    to={`/course/${activity.courseId}/lesson/${activity.lessonId}`}
                    className="profile-favorite-item"
                  >
                    <span className="profile-favorite-name">
                      {activity.courseTitle} • {activity.lessonTitle}
                    </span>
                    <ArrowRight weight="bold" className="profile-favorite-arrow" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="profile-empty-state">
                لم يبدأ نشاطك الدراسي بعد. ابدأ درسًا وسيظهر هنا.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
