// ---------------------------------------------------------------------------
// OrganizerHeader.jsx — Dedicated Navigation Header for Organizer Portal
// Adheres strictly to getHack visual language, typography, and theme tokens.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/useAuth";

function OrganizerHeader() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);

  // Scroll listener for border & shadow background transition
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          z-50
          w-full
          transition-[background-color,backdrop-filter,box-shadow]
          duration-300
          ease-out
          ${
            scrolled
              ? `
                bg-white/80
                backdrop-blur-lg
                shadow-[0_1px_3px_rgba(0,0,0,0.04)]
                dark:bg-neutral-950/75
                dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]
              `
              : `
                bg-white/50
                backdrop-blur-sm
                dark:bg-neutral-950/50
              `
          }
          border-b
          border-neutral-200/80
          dark:border-neutral-800/80
        `}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center px-5 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/organizer" className="group flex shrink-0 items-center gap-2">
            <span
              className="
                grid
                h-8
                w-8
                place-items-center
                rounded-lg
                bg-indigo-600
                text-base
                font-bold
                leading-none
                text-white
                transition-transform
                duration-200
                group-hover:scale-105
              "
            >
              g
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
                get<span className="text-indigo-500">Hack</span>
              </span>
              <span className="rounded-md border border-indigo-200 bg-indigo-50/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/80 dark:text-indigo-400">
                Organizer
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="ml-8 hidden items-center gap-1 md:flex">
            <NavLink
              to="/organizer/create"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive ? "font-semibold text-neutral-950 dark:text-white" : ""
                }`
              }
            >
              Add Hackathon
            </NavLink>

            <NavLink
              to="/organizer/hackathons"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive ? "font-semibold text-neutral-950 dark:text-white" : ""
                }`
              }
            >
              My Hackathons
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
            <div ref={dropdownRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="
                  flex
                  h-8
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  text-neutral-900
                  transition-colors
                  hover:bg-neutral-50
                  dark:border-neutral-800
                  dark:bg-neutral-900
                  dark:text-white
                  dark:hover:bg-neutral-800
                "
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "O"}
                </span>
                <span className="max-w-[110px] truncate">{user?.name || "Organizer"}</span>
                <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+8px)]
                    w-48
                    overflow-hidden
                    rounded-xl
                    border
                    border-neutral-200
                    bg-white
                    py-1
                    shadow-lg
                    shadow-neutral-950/5
                    dark:border-neutral-800
                    dark:bg-neutral-900
                    dark:shadow-neutral-950/40
                  "
                >
                  <div className="border-b border-neutral-100 px-3.5 py-2 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {user?.name || "Organizer Account"}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {user?.email || "organizer@gethack.io"}
                    </p>
                  </div>

                  <Link
                    to="/organizer/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="
                      flex
                      items-center
                      gap-2
                      px-3.5
                      py-2
                      text-xs
                      font-medium
                      text-neutral-700
                      transition-colors
                      hover:bg-neutral-50
                      dark:text-neutral-300
                      dark:hover:bg-neutral-800
                    "
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>Organizer Profile</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-2
                      px-3.5
                      py-2
                      text-xs
                      font-medium
                      text-red-600
                      transition-colors
                      hover:bg-red-50
                      dark:text-red-400
                      dark:hover:bg-red-950/40
                    "
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>

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
            md:hidden
            ${mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}
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
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="mt-2 w-full rounded-lg bg-neutral-950 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                Log out
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Fixed Header Spacer */}
      <div className="h-14" />
    </>
  );
}

export default OrganizerHeader;
