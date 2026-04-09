import "./Sidebar.css";
import { Books, Lightbulb, X } from "@phosphor-icons/react";
import { getCategoryMeta } from "../constants/categoryMeta";

function Sidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  isOpen,
  onClose,
}) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">التصنيفات</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <X className="sidebar-close-icon" weight="bold" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`sidebar-item ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => onCategorySelect("all")}
          >
            <Books className="sidebar-icon" weight="duotone" aria-hidden="true" />
            <span className="sidebar-label">جميع الدورات</span>
          </button>

          {categories.map((category) => {
            const Icon = getCategoryMeta(category).Icon;

            return (
              <button
                key={category}
                type="button"
                className={`sidebar-item ${selectedCategory === category ? "active" : ""}`}
                onClick={() => onCategorySelect(category)}
              >
                <Icon className="sidebar-icon" weight="duotone" aria-hidden="true" />
                <span className="sidebar-label">{category}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-help">
            <Lightbulb className="help-icon" weight="duotone" aria-hidden="true" />
            <p className="help-text">اختر تصنيفاً لتصفح الدورات المتعلقة به</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
