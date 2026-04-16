import { useMemo, useState } from "react";
import { ArrowClockwise, FadersHorizontal } from "@phosphor-icons/react";
import CourseCard from "./CourseCard";
import { formatCourseCount } from "../utils/arabicCourseCount";
import "./CoursesGrid.css";

const LOAD_MORE_STEP = 12;

function CoursesGrid({
  courses,
  selectedCategory,
  selectedLevel,
  searchQuery,
  onLevelChange,
  showFavoritesOnly,
  onShowFavoritesOnlyChange,
  onStartCourse,
  isFavoriteCourse,
  onToggleFavoriteCourse,
  onResetFilters,
}) {
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  const [sortBy, setSortBy] = useState("newest");

  const sortedCourses = useMemo(() => {
    const sorted = [...courses];

    switch (sortBy) {
      case "popular":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "oldest":
        return sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
      case "newest":
      default:
        return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
    }
  }, [courses, sortBy]);

  const visibleCourses = useMemo(
    () => sortedCourses.slice(0, visibleCount),
    [sortedCourses, visibleCount],
  );

  const canLoadMore = visibleCount < sortedCourses.length;

  const levelOptions = useMemo(() => {
    const levels = new Set();
    courses.forEach((course) => {
      if (course.level) levels.add(course.level);
    });
    return Array.from(levels);
  }, [courses]);

  const categoryLabel = searchQuery
    ? `نتائج "${searchQuery}"`
    : selectedCategory === "all"
    ? "جميع الدورات"
    : selectedCategory;

  return (
    <section className="courses-section" aria-labelledby="courses-title">
      <div className="courses-header">
        <div className="courses-title-wrap">
          <h2 className="courses-section-title" id="courses-title">
            {categoryLabel}
          </h2>
          <span className="courses-count">{formatCourseCount(courses.length)}</span>
        </div>

        <div className="courses-filters">
          <label className="filter-control" htmlFor="level-filter">
            <span className="filter-label">المستوى</span>
            <select
              id="level-filter"
              className="filter-select"
              value={selectedLevel}
              onChange={(event) => onLevelChange(event.target.value)}
            >
              <option value="all">الكل</option>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-control" htmlFor="sort-filter">
            <span className="filter-label">الترتيب</span>
            <div className="select-with-icon">
              <FadersHorizontal className="filter-icon" weight="duotone" aria-hidden="true" />
              <select
                id="sort-filter"
                className="filter-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="newest">الأحدث</option>
                <option value="oldest">الأقدم</option>
                <option value="popular">الأعلى تقييمًا</option>
              </select>
            </div>
          </label>

          <button
            type="button"
            className={`favorites-filter-btn ${showFavoritesOnly ? "active" : ""}`}
            aria-pressed={showFavoritesOnly}
            onClick={() => onShowFavoritesOnlyChange?.(!showFavoritesOnly)}
          >
            المفضلة فقط
          </button>
        </div>
      </div>

      {visibleCourses.length === 0 ? (
        <div className="courses-empty">
          <div className="empty-illustration" aria-hidden="true">
            <span className="empty-dot empty-dot-primary" />
            <span className="empty-dot empty-dot-accent" />
            <span className="empty-card" />
          </div>
          <p className="empty-title">لا توجد نتائج مطابقة حاليًا</p>
          <p className="empty-copy">جرّب تغيير التصنيف أو إعادة تعيين الفلاتر لعرض المزيد.</p>
          <button type="button" className="empty-reset-btn" onClick={onResetFilters}>
            <ArrowClockwise className="reset-icon" weight="duotone" aria-hidden="true" />
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <>
          <div className="courses-grid">
            {visibleCourses.map((course) => (
              <CourseCard
                key={`course-${course.id}`}
                title={course.title}
                instructor={course.instructor}
                instructorAvatar={course.instructorAvatar}
                description={course.description}
                duration={course.duration}
                lessonsCount={course.lessonsCount}
                level={course.level}
                category={course.category}
                thumbnail={course.thumbnail}
                isFeatured={course.isFeatured}
                progress={course.progress}
                rating={course.rating}
                isFavorite={isFavoriteCourse?.(course.id)}
                onToggleFavorite={() => onToggleFavoriteCourse?.(course.id)}
                onStart={() => onStartCourse(course)}
              />
            ))}
          </div>

          {canLoadMore && (
            <div className="courses-load-more">
              <button
                type="button"
                className="load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
              >
                عرض المزيد ({sortedCourses.length - visibleCount} متبقية)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default CoursesGrid;
