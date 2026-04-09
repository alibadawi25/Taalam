import "./CategoryGrid.css";
import { getCategoryMeta } from "../constants/categoryMeta";

function CategoryGrid({ categories, courseCounts, onCategorySelect }) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="category-section" aria-labelledby="category-title">
      <div className="category-header">
        <h2 className="category-section-title" id="category-title">
          تصفّح حسب التصنيف
        </h2>
        <p className="category-section-subtitle">
          اختر المجال المناسب لك ثم ابدأ من الدورات الأقرب لهدفك.
        </p>
      </div>

      <div className="category-grid">
        {categories.map((category) => {
          const data = getCategoryMeta(category);
          const Icon = data.Icon;
          const count = courseCounts?.[category] || 0;

          return (
            <button
              key={category}
              type="button"
              className="category-card"
              onClick={() => onCategorySelect(category)}
              style={{ "--category-color": data.color }}
            >
              <div className="category-icon-wrap">
                <Icon className="category-icon" weight="duotone" aria-hidden="true" />
              </div>
              <h3 className="category-name">{category}</h3>
              <span className="category-count">{count} دورة</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryGrid;
