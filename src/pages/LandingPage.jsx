import { useEffect, useState } from "react";
import "./LandingPage.css";
import Silk from "../components/Silk";
import CourseCard from "../components/CourseCard";
import { fetchFeaturedCourses, mapCourseToCardProps } from "../courseService";

function HomePage() {
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch courses from database on component mount
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const courses = await fetchFeaturedCourses(3); // Get 3 featured courses
        const mappedCourses = courses.map(mapCourseToCardProps).filter(Boolean);
        setFeaturedCourses(mappedCourses);
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('فشل في تحميل الدورات');
      } finally {
        setLoading(false);
      }
    }

    loadCourses();
  }, []);

  const handleStartCourse = (courseId) => {
    console.log(`Starting course ${courseId}`);
    // Add navigation logic here
    // navigate(`/course/${courseId}`);
  };

  return (
    <main className="home-page">
      {/* Hero Section - Sticky behind content */}
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
            <nav className="hero-header-right" aria-label="روابط التنقل">
              <a className="nav-link" href="#features">
                المميزات
              </a>
              <a className="nav-link" href="#paths">
                المسارات
              </a>
              <a className="nav-link" href="#contact">
                تواصل معنا
              </a>
            </nav>
          </div>
        </header>

        <div className="hero-content">
          <h1 className="title">تعلّم</h1>
          <p className="subtitle">
            تعلم دينك خطوة بخطوة بأسلوب سهل ومنظم، بدون تضييع وقت
          </p>
          <button className="cta-button">ابدأ الآن</button>
        </div>

        <div className="scroll-indicator" aria-hidden="true">
          <span className="scroll-arrow">↓</span>
          <span className="scroll-text">اكتشف المزيد</span>
        </div>
      </section>

      {/* Content that scrolls over the hero */}
      <div className="scroll-content">
        {/* Features Section */}
        <section className="features-section" id="features">
          <div className="section-container">
            <h2 className="section-title">لماذا تعلّم؟</h2>
            <p className="section-subtitle">
              ننتقي لك أفضل المحتوى الإسلامي من يوتيوب وننظمه في مسارات واضحة
            </p>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">فيديو</div>
                <h3 className="feature-title">محتوى منتقى</h3>
                <p className="feature-desc">
                  نختار أفضل الدروس من قنوات يوتيوب الموثوقة ونرتبها لك
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">ترتيب</div>
                <h3 className="feature-title">مسارات منظمة</h3>
                <p className="feature-desc">
                  بدلاً من التشتت، تعلم بترتيب منطقي من الأساسيات للمتقدم
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">تقدم</div>
                <h3 className="feature-title">تتبع تقدمك</h3>
                <p className="feature-desc">
                  احفظ مكانك واستمر من حيث توقفت في أي وقت
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">مجاني</div>
                <h3 className="feature-title">مجاني تماماً</h3>
                <p className="feature-desc">
                  محتوى يوتيوب متاح للجميع، نحن فقط ننظمه لك
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Courses Section */}
        <section className="paths-section" id="courses">
          <div className="section-container">
            <h2 className="section-title">الدورات المميزة</h2>
            <p className="section-subtitle">
              ابدأ رحلتك التعليمية مع أفضل الدورات المختارة بعناية
            </p>

            <div className="paths-grid">
              {loading ? (
                // Loading state
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '3rem',
                  fontFamily: 'Amiri, serif',
                  color: '#64748b',
                  fontSize: '1.1rem'
                }}>
                  جاري تحميل الدورات...
                </div>
              ) : error ? (
                // Error state
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '3rem',
                  fontFamily: 'Amiri, serif',
                  color: '#ef4444',
                  fontSize: '1.1rem'
                }}>
                  {error}
                </div>
              ) : featuredCourses.length === 0 ? (
                // Empty state
                <div style={{ 
                  gridColumn: '1 / -1', 
                  textAlign: 'center', 
                  padding: '3rem',
                  fontFamily: 'Amiri, serif',
                  color: '#64748b',
                  fontSize: '1.1rem'
                }}>
                  لا توجد دورات متاحة حالياً
                </div>
              ) : (
                // Courses loaded successfully
                featuredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    title={course.title}
                    instructor={course.instructor}
                    description={course.description}
                    duration={course.duration}
                    lessonsCount={course.lessonsCount}
                    level={course.level}
                    category={course.category}
                    thumbnail={course.thumbnail}
                    isFeatured={course.isFeatured}
                    onStart={() => handleStartCourse(course.id)}
                  />
                ))
              )}
            </div>

            {!loading && !error && featuredCourses.length > 0 && (
              <div className="paths-cta">
                <a href="/" className="view-all-link">
                  عرض جميع الدورات ←
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section className="contact-section" id="contact">
          <div className="section-container">
            <h2 className="section-title">تواصل معنا</h2>
            <p className="section-subtitle">نسعد بأسئلتك واقتراحاتك</p>

            <div className="contact-content">
              <a href="mailto:hello@taallam.app" className="contact-email">
                hello@taallam.app
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="site-footer">
          <div className="section-container">
            <p className="footer-text">© 2026 تعلّم - جميع الحقوق محفوظة</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default HomePage;
