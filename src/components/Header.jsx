import { useState } from "react";
import {
  ArrowRight,
  BookOpenText,
  SignOut,
  UserCircle,
} from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getCategoryMeta } from "../constants/categoryMeta";
import { isEnglishDisplayName } from "../utils/displayName";
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
  const { isAuthenticated, displayName, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isBackMode = Boolean(backHref);
  const isHomeRoute = pathname === "/home";
  const isAuthRoute = pathname === "/auth";
  const logoHref = isAuthenticated ? "/home" : isHomeRoute ? "/" : "/home";
  const showBackInfo = isBackMode && Boolean(backLabel || pageTitle || pageMeta);
  const isEnglishName = isEnglishDisplayName(displayName);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error("Unable to sign out", error);
    } finally {
      setIsSigningOut(false);
    }
  }

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

        <div className="header-account">
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="header-account-chip" title={displayName}>
                <UserCircle weight="duotone" aria-hidden="true" />
                <span
                  className={isEnglishName ? "header-account-name header-account-name--english" : "header-account-name"}
                  dir={isEnglishName ? "ltr" : "rtl"}
                >
                  {displayName}
                </span>
              </Link>
              <button
                type="button"
                className="header-account-btn"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <SignOut weight="duotone" aria-hidden="true" />
                <span>{isSigningOut ? "..." : "خروج"}</span>
              </button>
            </>
          ) : !isAuthRoute ? (
            <Link to="/auth" className="header-account-btn header-account-btn--link">
              <UserCircle weight="duotone" aria-hidden="true" />
              <span>دخول</span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
