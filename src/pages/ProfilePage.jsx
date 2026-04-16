import { useEffect, useState } from "react";
import {
  BookOpenText,
  CheckCircle,
  Clock,
  Heart,
  PencilSimple,
  ArrowRight,
  Gear,
  SignOut,
  X,
} from "@phosphor-icons/react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useFavoriteCourses } from "../hooks/useFavoriteCourses";
import Header from "../components/Header";
import { fetchCourses } from "../courseService";
import { updateProfile } from "../authService";
import { getLocalProgressStats } from "../lessonProgressService";
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
    async function loadCourses() {
      try {
        const data = await fetchCourses();
        setCourses(data || []);
      } catch (error) {
        console.error("Failed to load courses", error);
      } finally {
        setCoursesLoading(false);
      }
    }
    loadCourses();
  }, []);

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

  const favoriteCourseObjects = courses.filter((c) => favoriteCourseIds.has(String(c.id))).slice(0, 3);
  const progressStats = getLocalProgressStats();
  const completedCount = progressStats.completedLessonsCount;
  const inProgressCount = favoriteCourseIds.size;
  const learningHours = progressStats.totalLearningHours;

  return (
    <div className="profile-page" dir="rtl">
      <Header backHref="/home" backLabel="الدورات" pageTitle="ملفك الشخصي" />

      <main className="profile-shell">
        {/* Hero Section */}
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

          {/* Decorative Orbits */}
          <div className="profile-orbit profile-orbit--one" aria-hidden="true" />
          <div className="profile-orbit profile-orbit--two" aria-hidden="true" />
        </section>

        {/* Stats Section */}
        <section className="profile-stats">
          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--courses">
              <BookOpenText weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">دورات قيد الدراسة</span>
              <span className="profile-stat-value">{inProgressCount}</span>
            </div>
          </article>

          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--completed">
              <CheckCircle weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">دورات مكتملة</span>
              <span className="profile-stat-value">{completedCount}</span>
            </div>
          </article>

          <article className="profile-stat-card">
            <div className="profile-stat-icon profile-stat-icon--time">
              <Clock weight="duotone" aria-hidden="true" />
            </div>
            <div className="profile-stat-content">
              <span className="profile-stat-label">ساعات التعلم</span>
              <span className="profile-stat-value">{learningHours}</span>
            </div>
          </article>
        </section>

        {/* Main Content Grid */}
        <div className="profile-grid">
          {/* Profile Info Card */}
          <section className="profile-card profile-card--info">
            <h2 className="profile-card-title">معلومات الملف</h2>

            {!isEditing ? (
              <div className="profile-info-display">
                <div className="profile-info-item">
                  <span className="profile-info-label">الاسم</span>
                  <span className="profile-info-value">{profile?.full_name || "غير محدد"}</span>
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
              <form className="profile-edit-form" onSubmit={(e) => e.preventDefault()}>
                <label className="profile-form-field">
                  <span>الاسم</span>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => handleEditChange("fullName", e.target.value)}
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

                {saveError ? (
                  <p className="profile-form-error">{saveError}</p>
                ) : null}

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
                    onClick={() => { setIsEditing(false); setSaveError(""); }}
                    disabled={isSaving}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* Favorites Section */}
          <section className="profile-card profile-card--favorites">
            <div className="profile-card-header">
              <h2 className="profile-card-title">الدورات المفضلة</h2>
              {favoriteCourseObjects.length > 0 && (
                <Heart weight="duotone" className="profile-card-icon" aria-hidden="true" />
              )}
            </div>

            {coursesLoading ? (
              <div className="profile-favorites-loading">جاري التحميل...</div>
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

          {/* Account Settings */}
          <section className="profile-card profile-card--settings">
            <h2 className="profile-card-title">إعدادات الحساب</h2>

            <div className="profile-settings-group">
              <button type="button" className="profile-settings-item">
                <Gear weight="duotone" aria-hidden="true" />
                <span>تفضيلات التعلم</span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </button>

              <button type="button" className="profile-settings-item">
                <SignOut weight="duotone" aria-hidden="true" />
                <span>الخصوصية والأمان</span>
                <ArrowRight weight="bold" aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
