import {
  BookOpen,
  BookOpenText,
  BookmarkSimple,
  CheckCircle,
  Clock,
  Star,
} from "@phosphor-icons/react";
import "./CourseCard.css";

function CourseCard({
  title,
  instructor,
  instructorAvatar,
  description,
  duration,
  lessonsCount,
  level,
  category,
  thumbnail,
  progress = 0,
  rating = 4.7,
  isFavorite = false,
  isCompleted = false,
  isFeatured = false,
  onToggleFavorite,
  onStart,
  onContinue,
}) {
  const progressPercentage = Math.min(100, Math.max(0, progress));
  const hasStarted = progressPercentage > 0;
  const displayRating = Number.isFinite(Number(rating)) ? Number(rating) : 4.7;
  const ratingStars = Array.from({ length: 5 }, (_, index) => index + 1);

  const instructorInitial = instructor?.trim()?.[0] || "ت";

  return (
    <article className={`course-card ${isFeatured ? "featured" : ""}`}>
      <div className="course-thumbnail">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="course-image" />
        ) : (
          <div className="course-image-placeholder">
            <BookOpenText className="placeholder-icon" weight="duotone" aria-hidden="true" />
          </div>
        )}

        <button
          type="button"
          className={`course-bookmark ${isFavorite ? "is-active" : ""}`}
          aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
        >
          <BookmarkSimple
            className={`bookmark-icon ${isFavorite ? "filled" : ""}`}
            weight={isFavorite ? "fill" : "duotone"}
            aria-hidden="true"
          />
        </button>

        <div className="course-badges">
          {isFeatured && <span className="badge badge-featured">مميزة</span>}
          {isCompleted && (
            <span className="badge badge-completed">
              <CheckCircle className="badge-icon" weight="duotone" aria-hidden="true" />
              مكتمل
            </span>
          )}
          {level && <span className="badge badge-level">{level}</span>}
        </div>
      </div>

      <div className="course-instructor-strip">
        {instructorAvatar ? (
          <img src={instructorAvatar} alt={instructor} className="instructor-avatar" />
        ) : (
          <span className="instructor-avatar instructor-avatar-fallback" aria-hidden="true">
            {instructorInitial}
          </span>
        )}
        <span className="instructor-name">{instructor || "فريق تعلّم"}</span>
      </div>

      <div className="course-content">
        {category && (
          <div className="course-category">
            <span className="category-tag">{category}</span>
          </div>
        )}

        <h3 className="course-title">{title}</h3>

        {description && <p className="course-description">{description}</p>}

        <div className="course-rating" aria-label={`التقييم ${displayRating} من 5`}>
          <div className="rating-stars" aria-hidden="true">
            {ratingStars.map((star) => (
              <Star
                key={star}
                className={`rating-star ${displayRating >= star ? "filled" : ""}`}
                weight={displayRating >= star ? "fill" : "duotone"}
              />
            ))}
          </div>
          <span className="rating-value">{displayRating.toFixed(1)}</span>
        </div>

        {hasStarted && !isCompleted && (
          <div className="course-progress" aria-label={`نسبة التقدم ${progressPercentage}%`}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="progress-text">{progressPercentage}%</span>
          </div>
        )}

        <div className="course-meta">
          {lessonsCount ? (
            <div className="meta-item">
              <BookOpen className="meta-icon" weight="duotone" aria-hidden="true" />
              <span className="meta-text">{lessonsCount} درس</span>
            </div>
          ) : null}
          {duration ? (
            <div className="meta-item">
              <Clock className="meta-icon" weight="duotone" aria-hidden="true" />
              <span className="meta-text">{duration}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="course-btn"
          onClick={hasStarted ? onContinue || onStart : onStart}
        >
          {isCompleted ? "إعادة المشاهدة" : hasStarted ? "متابعة التعلم" : "ابدأ الآن"}
        </button>
      </div>
    </article>
  );
}

export default CourseCard;
