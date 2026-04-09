import {
  Bell,
  BookOpenText,
  UserCircle,
} from "@phosphor-icons/react";
import { getCategoryMeta } from "../constants/categoryMeta";
import "./Header.css";

function Header({ categories, selectedCategory, onCategorySelect }) {
  return (
    <header className="site-header" aria-label="التنقل الرئيسي للمكتبة">
      <div className="header-inner">
        <a href="/" className="header-logo" aria-label="العودة إلى الصفحة الرئيسية">
          تعلّم
        </a>

        <nav className="header-nav" aria-label="تصنيفات الدورات">
          <button
            type="button"
            className={`header-nav-item ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => onCategorySelect("all")}
          >
            <BookOpenText className="header-nav-icon" weight="duotone" aria-hidden="true" />
            <span>كل الدورات</span>
          </button>

          {categories.map((category) => {
            const Icon = getCategoryMeta(category).Icon;

            return (
              <button
                key={category}
                type="button"
                className={`header-nav-item ${selectedCategory === category ? "active" : ""}`}
                onClick={() => onCategorySelect(category)}
              >
                <Icon className="header-nav-icon" weight="duotone" aria-hidden="true" />
                <span>{category}</span>
              </button>
            );
          })}
        </nav>

        <div className="header-actions">
          <button type="button" className="header-icon-btn" aria-label="الإشعارات">
            <Bell className="header-action-icon" weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" className="header-avatar-btn" aria-label="الحساب الشخصي">
            <UserCircle className="header-action-icon" weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
