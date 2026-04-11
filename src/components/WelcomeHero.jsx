import { MagnifyingGlass, X } from "@phosphor-icons/react";
import "./WelcomeHero.css";
import { formatCourseCount } from "../utils/arabicCourseCount";

function WelcomeHero({ searchQuery, onSearchChange, totalCourses }) {
  return (
    <section className="welcome-hero" aria-label="بحث الدورات">
      <div className="welcome-content">
        <h1 className="welcome-title">مكتبة الدورات الشرعية</h1>
        <p className="welcome-subtitle">
          بين يديك أكثر من {formatCourseCount(totalCourses)} مرتبة بعناية لتتعلم بثبات وبترتيب واضح.
        </p>

        <div className="welcome-search">
          <MagnifyingGlass className="welcome-search-icon" weight="duotone" aria-hidden="true" />
          <input
            type="search"
            placeholder="ابحث عن دورة، مدرّس، أو موضوع"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="welcome-search-input"
            aria-label="بحث الدورات"
          />
          {searchQuery ? (
            <button
              type="button"
              className="welcome-search-clear"
              onClick={() => onSearchChange("")}
              aria-label="مسح البحث"
            >
              <X className="welcome-search-clear-icon" weight="duotone" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default WelcomeHero;
