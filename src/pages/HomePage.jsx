import "./HomaPage.css";
import Silk from "../components/Silk";

function HomePage() {
  return (
    <main className="home-page">
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
              <a className="nav-link" href="#about">
                عن التطبيق
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
      </section>

      <section className="home-section-empty" />
    </main>
  );
}

export default HomePage;
