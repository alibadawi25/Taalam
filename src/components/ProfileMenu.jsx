import { useRef, useState, useEffect } from "react";
import { Gear, SignOut, User } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isEnglishDisplayName } from "../utils/displayName";
import "./ProfileMenu.css";

function ProfileMenu() {
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated, displayName, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isEnglishName = isEnglishDisplayName(displayName);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsOpen(false);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to sign out", error);
      setIsSigningOut(false);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className={`profile-menu-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`فتح قائمة ${displayName}`}
      >
        <span
          className={`profile-menu-trigger-label ${isEnglishName ? "profile-menu-name--english" : ""}`}
          dir={isEnglishName ? "ltr" : "rtl"}
        >
          {displayName}
        </span>
        <span className="profile-menu-trigger-chevron" aria-hidden="true">
          ‹
        </span>
      </button>

      {isOpen && (
        <div className="profile-menu-dropdown" role="menu">
          <div className="profile-menu-header">
            <span
              className={`profile-menu-name ${isEnglishName ? "profile-menu-name--english" : ""}`}
              dir={isEnglishName ? "ltr" : "rtl"}
            >
              {displayName}
            </span>
          </div>

          <nav className="profile-menu-nav">
            <Link
              to="/profile"
              className="profile-menu-item"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <User weight="duotone" aria-hidden="true" />
              <span>ملفك الشخصي</span>
            </Link>

            <button
              type="button"
              className="profile-menu-item"
              role="menuitem"
              disabled={isSigningOut}
              onClick={handleSignOut}
            >
              <SignOut weight="duotone" aria-hidden="true" />
              <span>{isSigningOut ? "جاري الخروج..." : "خروج"}</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;
