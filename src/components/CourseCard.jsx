import "./CourseCard.css";

function CourseCard({
  title,
  instructor,
  description,
  duration,
  lessonsCount,
  level,
  category,
  thumbnail,
  progress = 0,
  isCompleted = false,
  isFeatured = false,
  onStart,
  onContinue,
}) {
  const progressPercentage = Math.min(100, Math.max(0, progress));
  const hasStarted = progressPercentage > 0;

  return (
    <article className={`course-card ${isFeatured ? "featured" : ""}`}>
      {/* Thumbnail Section */}
      <div className="course-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="course-image" />
        ) : (
          <div className="course-image-placeholder">
            <span className="placeholder-icon">📚</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="course-badges">
          {isFeatured && <span className="badge badge-featured">مميز</span>}
          {isCompleted && (
            <span className="badge badge-completed">مكتمل ✓</span>
          )}
          {level && <span className="badge badge-level">{level}</span>}
        </div>

        {/* Progress Bar (shown if started) */}
        {hasStarted && !isCompleted && (
          <div className="course-progress-overlay">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">{progressPercentage}%</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="course-content">
        {/* Category Tag */}
        {category && (
          <div className="course-category">
            <span className="category-tag">{category}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="course-title">{title}</h3>

        {/* Instructor */}
        {instructor && (
          <div className="course-instructor">
            <span className="instructor-icon">👤</span>
            <span className="instructor-name">{instructor}</span>
          </div>
        )}

        {/* Description */}
        {description && <p className="course-description">{description}</p>}

        {/* Meta Information */}
        <div className="course-meta">
          {lessonsCount && (
            <div className="meta-item">
              <span className="meta-icon">📖</span>
              <span className="meta-text">{lessonsCount} درس</span>
            </div>
          )}
          {duration && (
            <div className="meta-item">
              <span className="meta-icon">⏱</span>
              <span className="meta-text">{duration}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          className={`course-btn ${hasStarted ? "continue" : "start"}`}
          onClick={hasStarted ? onContinue : onStart}
        >
          {isCompleted
            ? "إعادة المشاهدة"
            : hasStarted
              ? "متابعة التعلم"
              : "ابدأ الآن"}
        </button>
      </div>
    </article>
  );
}

export default CourseCard;
