import {
  ArrowRight,
  BookOpenText,
} from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { getCategoryMeta } from "../constants/categoryMeta";
import "./Header.css";

function Header({
  categories = [],
  selectedCategory,
  onCategorySelect,
  backHref,
  backLabel,
  pageTitle,
  pageMeta,
}) {
  const { pathname } = useLocation();
  const isBackMode = Boolean(backHref);
  const isHomeRoute = pathname === "/home";
  const logoHref = isHomeRoute ? "/" : "/home";
  const showBackInfo = isBackMode && Boolean(backLabel || pageTitle || pageMeta);

  return (
    <header
      className={`site-header ${isBackMode ? "site-header--back" : ""}`}
      aria-label="التنقل الرئيسي"
    >
      <div className="header-inner">
        <Link to={logoHref || "/"} className="header-logo" aria-label="الصفحة الرئيسية">
          تعلّم
        </Link>

        {isBackMode ? (
          showBackInfo ? (
            <div className="header-breadcrumb">
              {backLabel ? (
                <Link to={backHref} className="header-back-link">
                  <ArrowRight weight="duotone" aria-hidden="true" />
                  <span>{backLabel}</span>
                </Link>
              ) : null}

              {pageTitle ? (
                <>
                  {backLabel ? (
                    <span className="header-breadcrumb-sep" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <span className="header-breadcrumb-title">{pageTitle}</span>
                </>
              ) : null}

              {pageMeta ? <span className="header-breadcrumb-meta">{pageMeta}</span> : null}
            </div>
          ) : (
            <div className="header-breadcrumb header-breadcrumb--empty" aria-hidden="true" />
          )
        ) : (
          <nav className="header-nav" aria-label="تصنيفات الدورات">
            <button
              type="button"
              className={`header-nav-item ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => onCategorySelect?.("all")}
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
                  onClick={() => onCategorySelect?.(category)}
                >
                  <Icon className="header-nav-icon" weight="duotone" aria-hidden="true" />
                  <span>{category}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
