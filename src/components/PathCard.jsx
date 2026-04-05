import "./PathCard.css";

function PathCard({
  title,
  description,
  coursesCount,
  totalDuration,
  difficulty,
  category,
  thumbnail,
  courses = [],
  progress = 0,
  isCompleted = false,
  isFeatured = false,
  onStart,
  onContinue,
}) {
  const progressPercentage = Math.min(100, Math.max(0, progress));
  const hasStarted = progressPercentage > 0;

  return (
    <article className={`path-card ${isFeatured ? "featured" : ""}`}>
      {/* Thumbnail Section */}
      <div className="path-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="path-image" />
        ) : (
          <div className="path-image-placeholder">
            <span className="placeholder-icon">🎯</span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="path-badges">
          {isFeatured && <span className="badge badge-featured">مميز</span>}
          {isCompleted && (
            <span className="badge badge-completed">مكتمل ✓</span>
          )}
          {difficulty && (
            <span className="badge badge-difficulty">{difficulty}</span>
          )}
        </div>

        {/* Progress Bar */}
        {hasStarted && !isCompleted && (
          <div className="path-progress-overlay">
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
      <div className="path-content">
        {/* Category Tag */}
        {category && (
          <div className="path-category">
            <span className="category-tag">{category}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="path-title">{title}</h3>

        {/* Description */}
        {description && <p className="path-description">{description}</p>}

        {/* Path Stats */}
        <div className="path-stats">
          {coursesCount && (
            <div className="stat-item">
              <span className="stat-icon">📚</span>
              <span className="stat-text">{coursesCount} دورات</span>
            </div>
          )}
          {totalDuration && (
            <div className="stat-item">
              <span className="stat-icon">⏱</span>
              <span className="stat-text">{totalDuration}</span>
            </div>
          )}
        </div>

        {/* Courses Preview (if provided) */}
        {courses.length > 0 && (
          <div className="path-courses-preview">
            <div className="courses-preview-title">المحتوى:</div>
            <ul className="courses-list">
              {courses.slice(0, 3).map((course, index) => (
                <li key={index} className="course-item">
                  <span className="course-bullet">•</span>
                  <span className="course-name">{course}</span>
                </li>
              ))}
              {courses.length > 3 && (
                <li className="course-item more">
                  <span className="course-more">
                    +{courses.length - 3} دورات أخرى
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Action Button */}
        <button
          className={`path-btn ${hasStarted ? "continue" : "start"}`}
          onClick={hasStarted ? onContinue : onStart}
        >
          {isCompleted
            ? "إعادة المسار"
            : hasStarted
              ? "متابعة المسار"
              : "ابدأ المسار"}
        </button>
      </div>
    </article>
  );
}

export default PathCard;
