import { useRef } from "react";
import { CaretLeft, CaretRight, Sparkle } from "@phosphor-icons/react";
import CourseCard from "./CourseCard";
import "./FeaturedCarousel.css";

function FeaturedCarousel({ courses, onStartCourse }) {
  const scrollRef = useRef(null);

  function scrollToPrev() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 360, behavior: "smooth" });
    }
  }

  function scrollToNext() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -360, behavior: "smooth" });
    }
  }

  if (!courses || courses.length === 0) {
    return null;
  }

  return (
    <section className="featured-section" aria-labelledby="featured-title">
      <div className="featured-header">
        <div className="featured-title-wrap">
          <span className="featured-badge">
            <Sparkle className="featured-badge-icon" weight="fill" aria-hidden="true" />
            <span>مميز</span>
          </span>
          <h2 className="featured-title" id="featured-title">
            الدورات المميزة
          </h2>
        </div>
        <div className="featured-controls">
          <button
            type="button"
            className="carousel-btn"
            onClick={scrollToPrev}
            aria-label="السابق"
          >
            <CaretRight className="carousel-btn-icon" weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="carousel-btn"
            onClick={scrollToNext}
            aria-label="التالي"
          >
            <CaretLeft className="carousel-btn-icon" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="featured-carousel" ref={scrollRef}>
        {courses.map((course) => (
          <div className="carousel-item" key={`featured-${course.id}`}>
            <CourseCard
              title={course.title}
              instructor={course.instructor}
              description={course.description}
              duration={course.duration}
              lessonsCount={course.lessonsCount}
              level={course.level}
              category={course.category}
              thumbnail={course.thumbnail}
              isFeatured={true}
              onStart={() => onStartCourse(course.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default FeaturedCarousel;
