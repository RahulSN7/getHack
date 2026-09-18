
// OrganizerHeader.jsx — Dedicated Navigation Header for Organizer Portal
// Adheres strictly to getHack visual language, typography, and theme tokens.


import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/useAuth";
import Logo from "../common/Logo";
function OrganizerHeaderUserAvatar({ user }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = resolveAvatarUrl(user?.profile?.avatar || user?.avatar, user?.updatedAt);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  if (avatarUrl && !imgError) {
    return (
      <img
        key={avatarUrl}
        src={avatarUrl}
        alt={user?.name ? `${user.name} profile photo` : "Organizer profile photo"}
        onError={() => setImgError(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <span className="h-full w-full flex items-center justify-center">
      {user?.name ? user.name.charAt(0).toUpperCase() : "O"}
    </span>
  );
}

function OrganizerHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  const isAddHackathonActive = location.pathname.startsWith("/organizer/create");
  const isMyHackathonsActive = location.pathname.startsWith("/organizer/hackathons");

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Scroll listener for border & shadow background transition
  useEffect(() => {
    let tick = false;
    const onScroll = () => {
      if (!tick) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 25);
          tick = false;
        });
        tick = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user dropdown on click outside or Escape key press
  useEffect(() => {
    if (!userDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userDropdownOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navLinkClass = `
    rounded-lg
    px-3
    py-1.5
    text-sm
    font-medium
    text-neutral-600
    transition-colors
    duration-150
    hover:text-neutral-950
    dark:text-neutral-400
    dark:hover:text-white
  `;

  const iconBtnClass = `
    grid
    h-9
    w-9
    place-items-center
    rounded-lg
    text-neutral-500
    transition-colors
    duration-150
    hover:text-neutral-900
    dark:text-neutral-400
    dark:hover:text-white
  `;

  return (
    <>
      <header
        className={`
          fixed
          top-0
          left-0
          right-0
          z-50
          flex
          justify-center
          pointer-events-none
          transition-all
          duration-300
          ease-out
          ${scrolled && !mobileMenuOpen
            ? "pt-3.5 sm:pt-4 px-3.5 sm:px-6 lg:px-8"
            : "pt-0 px-0"
          }
        `}
      >
        <div
          className={`
            pointer-events-auto
            w-full
            transition-all
            duration-300
            ease-out
            overflow-visible
            ${scrolled && !mobileMenuOpen
              ? `
                  max-w-6xl
                  rounded-full
                  border
                  border-neutral-200/80
                  bg-white/80
                  backdrop-blur-md
                  shadow-md
                  shadow-neutral-950/5
                  dark:border-neutral-800/80
                  dark:bg-neutral-950/80
                  dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]
                `
              : `
                  max-w-7xl
                  rounded-none
                  border-b
                  ${scrolled || mobileMenuOpen
                ? `
                        border-neutral-200/60
                        bg-white/80
                        backdrop-blur-md
                        shadow-xs
                        dark:border-neutral-800/60
                        dark:bg-neutral-950/80
                        dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]
                      `
                : `
                        border-transparent
                        bg-transparent
                        shadow-none
                        backdrop-blur-none
                      `
              }
                `
            }
          `}
        >
          <div
            className={`
              mx-auto
              flex
              h-14
              w-full
              items-center
              justify-between
              transition-all
              duration-300
              ${scrolled && !mobileMenuOpen ? "px-4 sm:px-6" : "px-5 sm:px-6 lg:px-8"}
            `}
          >
            {/* Logo */}
            <Link to="/organizer" className="group flex shrink-0 items-center gap-2">
              <Logo className="h-7 w-auto" />
              <span className="rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/80 dark:text-indigo-400">
                Organizer
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="ml-8 hidden h-14 items-center gap-1 md:flex">
              <NavLink
                to="/organizer/create"
                className={`relative flex h-full items-center px-3 text-sm font-medium ${isAddHackathonActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                  }`}
              >
                <span>Add Hackathon</span>
                {isAddHackathonActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-150" />
                )}
              </NavLink>

              <NavLink
                to="/organizer/hackathons"
                className={`relative flex h-full items-center px-3 text-sm font-medium ${isMyHackathonsActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                  }`}
              >
                <span>My Hackathons</span>
                {isMyHackathonsActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-150" />
                )}
              </NavLink>
            </nav>

            {/* Right Action Menu */}
            <div className="ml-auto flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={iconBtnClass}
              >
                {darkMode ? (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M4.93 4.93l1.41 1.41" />
                    <path d="M17.66 17.66l1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="M6.34 17.66l-1.41 1.41" />
                    <path d="M19.07 4.93l-1.41 1.41" />
                  </svg>
                ) : (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Profile Dropdown / Actions */}
              {authLoading ? (
                <div
                  className={`ml-1.5 h-8 shrink-0 opacity-0 pointer-events-none ${user ? "w-8 block" : "w-[72px] hidden sm:block"
                    }`}
                  aria-hidden="true"
                />
              ) : isAuthenticated ? (
                <div ref={dropdownRef} className="relative ml-1.5 hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((prev) => !prev)}
                    aria-label="Organizer profile menu"
                    aria-expanded={userDropdownOpen}
                    className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-neutral-200
                    bg-white
                    p-0.5
                    text-xs
                    font-semibold
                    text-neutral-900
                    transition-colors
                    hover:bg-neutral-50
                    hover:border-neutral-300
                    dark:border-neutral-800
                    dark:bg-neutral-900
                    dark:text-white
                    dark:hover:bg-neutral-800
                    cursor-pointer
                  "
                  >
                    <span className="relative grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white overflow-hidden shrink-0">
                      <OrganizerHeaderUserAvatar user={user} />
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="
                      absolute
                      right-0
                      top-[calc(100%+12px)]
                      w-44
                      overflow-hidden
                      rounded-xl
                      border
                      border-neutral-200
                      bg-white
                      py-1
                      shadow-xl
                      shadow-neutral-950/10
                      dark:border-neutral-800
                      dark:bg-neutral-900
                      dark:shadow-neutral-950/50
                      z-50
                    "
                    >
                      <Link
                        to="/organizer/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="
                        flex
                        w-full
                        items-center
                        gap-2.5
                        px-3.5
                        py-2
                        text-xs
                        font-medium
                        text-neutral-700
                        transition-colors
                        hover:bg-neutral-100
                        dark:text-neutral-300
                        dark:hover:bg-neutral-800
                      "
                      >
                        <svg className="h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        <span>Profile</span>
                      </Link>

                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                      <button
                        type="button"
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          navigate("/", { replace: true });
                          await logout();
                        }}
                        className="
                        flex
                        w-full
                        items-center
                        gap-2.5
                        px-3.5
                        py-2
                        text-xs
                        font-medium
                        text-rose-600
                        transition-colors
                        hover:bg-rose-50
                        dark:text-rose-400
                        dark:hover:bg-rose-950/40
                        text-left
                        cursor-pointer
                      "
                      >
                        <svg className="h-4 w-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="
                  hidden
                  h-8
                  items-center
                  justify-center
                  rounded-lg
                  bg-neutral-950
                  px-3.5
                  ml-1.5
                  text-sm
                  font-medium
                  text-white
                  transition-colors
                  duration-150
                  hover:bg-neutral-800
                  dark:bg-white
                  dark:text-neutral-950
                  dark:hover:bg-neutral-200
                  sm:flex
                "
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
                className={`${iconBtnClass} md:hidden`}
              >
                {mobileMenuOpen ? (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                ) : (
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          <div
            className={`
            overflow-hidden
            transition-[max-height,opacity]
            duration-300
            ease-out
            bg-white
            dark:bg-neutral-950
            border-b
            border-neutral-200/80
            dark:border-neutral-800/80
            shadow-lg
            shadow-neutral-950/5
            dark:shadow-neutral-950/40
            md:hidden
            ${mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
          `}
          >
            <nav className="mx-auto max-w-7xl px-5 pb-4 sm:px-6 lg:px-8">
              <div className="space-y-0.5 border-t border-neutral-200/60 pt-3 dark:border-neutral-800">
                <Link
                  to="/organizer/create"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Add Hackathon
                </Link>

                <Link
                  to="/organizer/hackathons"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  My Hackathons
                </Link>

                <Link
                  to="/organizer/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Profile
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    navigate("/", { replace: true });
                    await logout();
                  }}
                  className="mt-2 w-full rounded-lg bg-neutral-950 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
                >
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-14 z-40 bg-neutral-950/30 backdrop-blur-xs transition-opacity md:hidden dark:bg-neutral-950/50"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed Header Spacer */}
      <div className="h-14" />
    </>
  );
}

export default OrganizerHeader;
