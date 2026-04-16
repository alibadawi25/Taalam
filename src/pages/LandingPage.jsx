import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChartLineUp,
  GridFour,
  PlayCircle,
  Star,
  TelegramLogo,
  XLogo,
} from "@phosphor-icons/react";
import { Navigate, useNavigate } from "react-router-dom";
import CourseCard from "../components/CourseCard";
import Silk from "../components/Silk";
import { fetchFeaturedCourses, mapCourseToCardProps } from "../courseService";
import { useFavoriteCourses } from "../hooks/useFavoriteCourses";
import { useAuth } from "../hooks/useAuth";
import "./LandingPage.css";

const FEATURES = [
  {
    title: "محتوى مرئي منتقى",
    description: "دروس فيديو موثوقة ومختصرة، مصنفة بوضوح لسرعة الوصول.",
    Icon: PlayCircle,
  },
  {
    title: "تتبع التقدم",
    description: "حافظ على استمراريتك عبر متابعة ما أنهيته وما تبقّى لك.",
    Icon: ChartLineUp,
  },
  {
    title: "مسارات منظمة",
    description: "تسلسل تعليمي واضح من الأساسيات إلى التوسع المتدرج.",
    Icon: GridFour,
  },
  {
    title: "مجاني بالكامل",
    description: "محتوى نافع متاح للجميع بدون اشتراكات أو رسوم إضافية.",
    Icon: Star,
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const { displayName, isAuthenticated, loading: authLoading, signOut } = useAuth();
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isFavorite, toggleFavoriteCourse } = useFavoriteCourses();

  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    return () => {
      document.documentElement.classList.remove("landing-active");
    };
  }, []);

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);

        const courses = await fetchFeaturedCourses(3);
        const mappedCourses = courses.map(mapCourseToCardProps).filter(Boolean);
        setFeaturedCourses(mappedCourses);
      } catch (loadError) {
        console.error("Error loading featured courses:", loadError);
        setError("تعذر تحميل الدورات المميزة.");
      } finally {
        setLoading(false);
      }
    }

    void loadCourses();
  }, []);

  function handleGoHome() {
    navigate("/home");
  }

  function handleStartCourse(course) {
    if (!course?.id) return;
    navigate(`/course/${course.id}`);
  }

  function handleToggleFavoriteCourse(courseId) {
    void toggleFavoriteCourse(courseId);
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (signOutError) {
      console.error("Unable to sign out", signOutError);
    }
  }

  if (!authLoading && isAuthenticated) {
    return <Navigate replace to="/home" />;
  }

  return (
    <main className="home-page" dir="rtl">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <Silk
            speed={1.1}
            scale={0.8}
            color="#e8ecff"
            noiseIntensity={1.15}
            rotation={0}
          />
        </div>

        <div className="hero-overlay" aria-hidden="true" />

        <header className="hero-header">
          <div className="hero-header-inner">
            <div className="hero-header-left">تعلّم</div>
            <div className="hero-header-right">
              <nav aria-label="روابط التنقل" className="hero-nav">
                <a className="nav-link" href="#features">
                  لماذا تعلّم
                </a>
                <a className="nav-link" href="#courses">
                  الدورات
                </a>
                <a className="nav-link" href="#contact">
                  تواصل معنا
                </a>
              </nav>

              {isAuthenticated ? (
                <div className="hero-account">
                  <span className="hero-account-chip">{displayName}</span>
                  <button type="button" className="hero-account-btn" onClick={handleSignOut}>
                    خروج
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="hero-account-btn"
                  onClick={() => navigate("/auth")}
                >
                  دخول / حساب جديد
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="hero-content">
          <h1 className="title">تعلّم</h1>
          <p className="subtitle">
            تعلم دينك خطوة بخطوة بأسلوب سهل ومنظم، بدون تضييع وقت
          </p>

          <button type="button" className="cta-button" onClick={handleGoHome}>
            ابدأ الآن
          </button>
        </div>

        <div className="scroll-indicator" aria-hidden="true">
          <div className="scroll-mouse">
            <div className="scroll-dot" />
          </div>
          <span className="scroll-text">اكتشف المزيد</span>
        </div>
      </section>

      <div className="scroll-content">
        <section className="features-section" id="features">
          <div className="section-container">
            <h2 className="section-title">لماذا تعلّم؟</h2>
            <p className="section-subtitle">
              منصة تعليمية إسلامية تركز على الوضوح، التنظيم، والاستمرارية.
            </p>

            <div className="features-grid">
              {FEATURES.map((feature) => {
                const FeatureIcon = feature.Icon;

                return (
                  <article key={feature.title} className="feature-card">
                    <FeatureIcon className="feature-icon" weight="duotone" aria-hidden="true" />
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-desc">{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="paths-section" id="courses">
          <div className="section-container">
            <h2 className="section-title courses-title">الدورات المميزة</h2>
            <span className="gold-underline" aria-hidden="true" />
            <p className="section-subtitle">ثلاث دورات مختارة لتبدأ بها فورًا.</p>

            {loading ? (
              <p className="section-message">جاري تحميل الدورات...</p>
            ) : error ? (
              <p className="section-message section-message-error">{error}</p>
            ) : featuredCourses.length === 0 ? (
              <p className="section-message">لا توجد دورات مميزة متاحة حاليًا.</p>
            ) : (
              <div className="paths-grid">
                {featuredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    title={course.title}
                    instructor={course.instructor}
                    instructorAvatar={course.instructorAvatar}
                    description={course.description}
                    duration={course.duration}
                    lessonsCount={course.lessonsCount}
                    level={course.level}
                    category={course.category}
                    thumbnail={course.thumbnail}
                    isFeatured
                    progress={course.progress}
                    rating={course.rating}
                    isFavorite={isFavorite(course.id)}
                    onToggleFavorite={() => handleToggleFavoriteCourse(course.id)}
                    onStart={() => handleStartCourse(course)}
                  />
                ))}
              </div>
            )}

            {!loading && !error && featuredCourses.length > 0 ? (
              <div className="paths-cta">
                <a href="/home" className="view-all-link">
                  <span>عرض جميع الدورات</span>
                  <ArrowLeft className="view-all-icon" weight="duotone" aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="section-container">
            <div className="contact-card">
              <h2 className="section-title">تواصل معنا</h2>
              <p className="section-subtitle">للاقتراحات أو الشراكات التعليمية يسعدنا تواصلك.</p>

              <a href="mailto:hello@taallam.app" className="contact-email" dir="ltr">
                hello@taallam.app
              </a>

              <div className="social-links" aria-label="قنوات التواصل">
                <a
                  className="social-link"
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter X"
                >
                  <XLogo className="social-icon" weight="duotone" aria-hidden="true" />
                </a>
                <a
                  className="social-link"
                  href="https://t.me"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram"
                >
                  <TelegramLogo className="social-icon" weight="duotone" aria-hidden="true" />
                </a>
              </div>

              <p className="contact-hint">نرد عادة خلال 24 ساعة</p>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <div className="section-container">
            <p className="footer-text">© 2026 تعلّم - جميع الحقوق محفوظة</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default LandingPage;
