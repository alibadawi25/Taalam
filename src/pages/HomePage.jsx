import { useEffect, useMemo, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import WelcomeHero from "../components/WelcomeHero";
import CategoryGrid from "../components/CategoryGrid";
import CoursesGrid from "../components/CoursesGrid";
import { fetchCourses, mapCourseToCardProps } from "../courseService";
import { useFavoriteCourses } from "../hooks/useFavoriteCourses";
import "./HomePage.css";

const LOADING_SKELETON_CARDS = Array.from({ length: 6 }, (_, index) => index);

function HomePage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const { isFavorite, toggleFavoriteCourse } = useFavoriteCourses();

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError(null);

        const allCourses = await fetchCourses();
        const mappedCourses = allCourses.map(mapCourseToCardProps).filter(Boolean);

        if (isMounted) {
          setCourses(mappedCourses);
        }
      } catch (loadError) {
        console.error("Error loading courses:", loadError);

        if (isMounted) {
          setError("تعذر تحميل الدورات في الوقت الحالي.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const seen = new Set();
    return courses
      .map((course) => course.category)
      .filter((category) => {
        if (!category || seen.has(category)) {
          return false;
        }
        seen.add(category);
        return true;
      });
  }, [courses]);

  const courseCounts = useMemo(() => {
    const counts = {};
    courses.forEach((course) => {
      if (course.category) {
        counts[course.category] = (counts[course.category] || 0) + 1;
      }
    });
    return counts;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesCategory =
        selectedCategory === "all" || course.category === selectedCategory;
      const matchesLevel =
        selectedLevel === "all" || course.level === selectedLevel;
      const matchesFavorites =
        !showFavoritesOnly || isFavorite(course.id);

      if (!matchesCategory || !matchesLevel || !matchesFavorites) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        course.title,
        course.description,
        course.instructor,
        course.category,
        course.level,
      ];

      return searchableValues
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [
    courses,
    searchQuery,
    selectedCategory,
    selectedLevel,
    showFavoritesOnly,
    isFavorite,
  ]);

  function handleStartCourse(course) {
    if (!course?.id) return;
    navigate(`/course/${course.id}`);
  }

  function handleToggleFavoriteCourse(courseId) {
    void toggleFavoriteCourse(courseId);
  }

  function handleCategorySelect(category) {
    setSelectedCategory(category);
    document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleResetFilters() {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedLevel("all");
    setShowFavoritesOnly(false);
  }

  return (
    <div className="library-page" dir="rtl">
      <Header
        categories={categoryOptions}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      <main className="library-main" aria-label="مكتبة الدورات">
        {loading ? (
          <div className="library-loading" aria-live="polite" aria-busy="true">
            <div className="library-loading-head">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-subtitle" />
            </div>

            <div className="library-loading-grid">
              {LOADING_SKELETON_CARDS.map((cardIndex) => (
                <article className="library-loading-card" key={`loading-card-${cardIndex}`}>
                  <div className="skeleton skeleton-thumb" />
                  <div className="library-loading-content">
                    <div className="skeleton skeleton-chip" />
                    <div className="skeleton skeleton-line skeleton-line--lg" />
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line skeleton-line--short" />
                    <div className="skeleton skeleton-button" />
                  </div>
                </article>
              ))}
            </div>

            <p className="loading-text">جاري تجهيز مكتبة الدورات...</p>
          </div>
        ) : error ? (
          <div className="library-error">
            <WarningCircle className="error-icon" weight="duotone" aria-hidden="true" />
            <p className="error-text">{error}</p>
            <button
              type="button"
              className="error-retry"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="library-content">
            <WelcomeHero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalCourses={courses.length}
            />

            <CategoryGrid
              categories={categoryOptions}
              courseCounts={courseCounts}
              onCategorySelect={handleCategorySelect}
            />

            <div id="courses-section">
              <CoursesGrid
                key={`${selectedCategory}-${selectedLevel}-${searchQuery.trim()}`}
                courses={filteredCourses}
                selectedCategory={selectedCategory}
                selectedLevel={selectedLevel}
                searchQuery={searchQuery.trim()}
                onLevelChange={setSelectedLevel}
                showFavoritesOnly={showFavoritesOnly}
                onShowFavoritesOnlyChange={setShowFavoritesOnly}
                onStartCourse={handleStartCourse}
                isFavoriteCourse={isFavorite}
                onToggleFavoriteCourse={handleToggleFavoriteCourse}
                onResetFilters={handleResetFilters}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;
