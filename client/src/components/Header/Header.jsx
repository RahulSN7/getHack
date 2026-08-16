import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

function Header() {
  // --------------------------------------------------
  // DARK / LIGHT MODE (from global context)
  // --------------------------------------------------

  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";

  // --------------------------------------------------
  // SCROLL STATE
  // --------------------------------------------------

  const [scrolled, setScrolled] = useState(false);

  // --------------------------------------------------
  // OTHER STATES
  // --------------------------------------------------

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notificationRef = useRef(null);

  // --------------------------------------------------
  // SCROLL LISTENER
  // --------------------------------------------------

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    // Check initial position (e.g. if page loaded already scrolled)
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);


  // --------------------------------------------------
  // CLOSE NOTIFICATION WHEN CLICKING OUTSIDE
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // --------------------------------------------------
  // FUNCTIONS
  // --------------------------------------------------


  const toggleNotifications = () => {
    setNotificationOpen((previous) => !previous);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((previous) => !previous);
  };

  // --------------------------------------------------
  // NAV LINK STYLES (reusable)
  // --------------------------------------------------

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
      {/* ==================================================
          HEADER
          ================================================== */}

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
                bg-transparent
              `
          }
        `}
      >
        <div
          className="
            mx-auto
            flex
            h-14
            max-w-7xl
            items-center
            px-5
            sm:px-6
            lg:px-8
          "
        >
          {/* ==================================================
              LOGO
              ================================================== */}

          <Link
            to="/"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            {/* Logo mark */}

            <span
              className="
                grid
                h-8
                w-8
                place-items-center
                rounded-lg

                bg-neutral-950

                text-base
                font-bold
                leading-none
                text-white

                transition-transform
                duration-200

                group-hover:scale-105

                dark:bg-white
                dark:text-neutral-950
              "
            >
              g
            </span>

            {/* Logo text */}

            <span
              className="
                text-lg
                font-bold
                tracking-tight

                text-neutral-900

                dark:text-white
              "
            >
              get<span className="text-indigo-500">Hack</span>
            </span>
          </Link>

          {/* ==================================================
              DESKTOP NAVIGATION
              ================================================== */}

          <nav
            className="
              ml-8
              hidden
              items-center
              gap-0.5

              md:flex
            "
          >
            <NavLink
              to="/hackathons"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              Hackathons
            </NavLink>

            <NavLink
              to="/teammates"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              Find Teammates
            </NavLink>

            <NavLink
              to="/network"
              className={({ isActive }) =>
                `${navLinkClass} ${
                  isActive
                    ? "font-semibold text-neutral-950 dark:text-white"
                    : ""
                }`
              }
            >
              My Network
            </NavLink>
          </nav>

          {/* ==================================================
              RIGHT SIDE
              ================================================== */}

          <div
            className="
              ml-auto
              flex
              items-center
              gap-0.5
            "
          >
            {/* ==================================================
                NOTIFICATIONS
                ================================================== */}

            <div
              ref={notificationRef}
              className="relative"
            >
              <button
                type="button"
                onClick={toggleNotifications}
                aria-label="Notifications"
                className={iconBtnClass}
              >
                {/* Bell icon */}

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>

                {/* Notification count */}

                <span
                  className={`
                    absolute
                    right-0.5
                    top-0.5

                    grid
                    h-4
                    min-w-4
                    place-items-center

                    rounded-full

                    bg-indigo-500

                    px-1

                    text-[9px]
                    font-bold
                    text-white

                    ring-2
                    ${scrolled
                      ? "ring-white/80 dark:ring-neutral-950/75"
                      : "ring-slate-50 dark:ring-neutral-950"
                    }

                    transition-[box-shadow]
                    duration-300
                  `}
                >
                  3
                </span>
              </button>

              {/* ==================================================
                  NOTIFICATION DROPDOWN
                  ================================================== */}

              {notificationOpen && (
                <div
                  className="
                    absolute
                    right-0
                    top-[calc(100%+8px)]

                    w-80

                    overflow-hidden
                    rounded-xl

                    bg-white

                    shadow-lg
                    shadow-neutral-950/8

                    dark:bg-neutral-900
                    dark:shadow-neutral-950/40
                  "
                >
                  {/* Header */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-4
                      py-3
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-sm
                          font-semibold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        Notifications
                      </h3>

                      <p
                        className="
                          mt-0.5
                          text-xs
                          text-neutral-500

                          dark:text-neutral-400
                        "
                      >
                        3 unread updates
                      </p>
                    </div>

                    <button
                      type="button"
                      className="
                        text-xs
                        font-medium
                        text-indigo-500
                        hover:text-indigo-600
                      "
                    >
                      Mark all read
                    </button>
                  </div>

                  {/* Notification items */}

                  {[
                    {
                      icon: (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <line x1="19" y1="8" x2="19" y2="14" />
                          <line x1="22" y1="11" x2="16" y2="11" />
                        </svg>
                      ),
                      color: "bg-indigo-500/10 text-indigo-500",
                      title: "New team invitation",
                      desc: "You received a new team invitation.",
                      time: "5 min ago",
                    },
                    {
                      icon: (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      ),
                      color: "bg-emerald-500/10 text-emerald-500",
                      title: "Team member joined",
                      desc: "A new member joined your team.",
                      time: "32 min ago",
                    },
                    {
                      icon: (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                      ),
                      color: "bg-amber-500/10 text-amber-500",
                      title: "Hackathon deadline",
                      desc: "A saved hackathon closes soon.",
                      time: "2 hrs ago",
                    },
                  ].map((n) => (
                    <button
                      key={n.title}
                      type="button"
                      className="
                        flex
                        w-full
                        gap-3
                        px-4
                        py-2.5
                        text-left

                        transition-colors

                        hover:bg-neutral-50

                        dark:hover:bg-white/5
                      "
                    >
                      <div
                        className={`
                          grid
                          h-8
                          w-8
                          shrink-0
                          place-items-center
                          rounded-lg
                          ${n.color}
                        `}
                      >
                        {n.icon}
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            text-xs
                            font-semibold
                            text-neutral-900

                            dark:text-white
                          "
                        >
                          {n.title}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            leading-relaxed
                            text-neutral-500

                            dark:text-neutral-400
                          "
                        >
                          {n.desc}
                        </p>

                        <span
                          className="
                            mt-0.5
                            block
                            text-[10px]
                            text-neutral-400
                          "
                        >
                          {n.time}
                        </span>
                      </div>
                    </button>
                  ))}

                  {/* View all */}

                  <button
                    type="button"
                    className="
                      w-full
                      px-4
                      py-2.5

                      text-xs
                      font-semibold
                      text-indigo-500

                      transition-colors

                      hover:bg-neutral-50

                      dark:hover:bg-white/5
                    "
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            {/* ==================================================
                THEME BUTTON
                ================================================== */}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                darkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className={iconBtnClass}
            >
              {darkMode ? (
                /* SUN */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
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
                /* MOON */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* ==================================================
                LOGIN
                ================================================== */}

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
              Log in
            </Link>

            {/* ==================================================
                MOBILE MENU BUTTON
                ================================================== */}

            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              className={`
                ${iconBtnClass}
                md:hidden
              `}
            >
              {mobileMenuOpen ? (
                /* CLOSE */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                /* MENU */

                <svg
                  className="h-[18px] w-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ==================================================
            MOBILE NAVIGATION
            ================================================== */}

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
          <nav
            className="
              mx-auto
              max-w-7xl

              px-5
              pb-4

              sm:px-6
              lg:px-8
            "
          >
            <div
              className="
                space-y-0.5
                border-t
                border-neutral-200/60
                pt-3

                dark:border-white/8
              "
            >
              <Link
                to="/hackathons"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                Hackathons
              </Link>

              <Link
                to="/teammates"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                Find Teammates
              </Link>

              <Link
                to="/network"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  block
                  rounded-lg
                  px-3
                  py-2.5

                  text-sm
                  font-medium

                  text-neutral-700

                  transition-colors

                  hover:bg-neutral-100

                  dark:text-neutral-300
                  dark:hover:bg-white/5
                "
              >
                My Network
              </Link>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="
                  mt-2
                  block
                  rounded-lg

                  bg-neutral-950

                  px-3
                  py-2.5

                  text-center
                  text-sm
                  font-medium
                  text-white

                  transition-colors

                  hover:bg-neutral-800

                  dark:bg-white
                  dark:text-neutral-950
                  dark:hover:bg-neutral-200
                "
              >
                Log in
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Spacer so content is not hidden behind fixed header */}
      <div className="h-14" />
    </>
  );
}

export default Header;