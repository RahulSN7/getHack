import { useEffect, useRef, useState } from "react";

function Header() {
  // --------------------------------------------------
  // DARK / LIGHT MODE
  // --------------------------------------------------

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // --------------------------------------------------
  // OTHER STATES
  // --------------------------------------------------

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const notificationRef = useRef(null);

  // --------------------------------------------------
  // APPLY THEME
  // --------------------------------------------------

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

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

  // --------------------------------------------------
  // FUNCTIONS
  // --------------------------------------------------

  const toggleTheme = () => {
    setDarkMode((previous) => !previous);
  };

  const toggleNotifications = () => {
    setNotificationOpen((previous) => !previous);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((previous) => !previous);
  };

  return (
    <>
     

    
      {/* ==================================================
          HEADER
          ================================================== */}

      <header
        className="
          sticky
          top-0
          z-50
          px-4
          py-3
          sm:px-6
        "
      >
      <div
  className="
    mx-auto
    flex
    min-h-16
    max-w-7xl
    items-center
    rounded-2xl

    bg-white/40
    px-4

    backdrop-blur-2xl
    backdrop-saturate-150

    ring-1
    ring-white/30

    shadow-[0_8px_32px_rgba(15,23,42,0.08)]

    transition-all
    duration-300

    dark:bg-neutral-900/40
    dark:ring-white/10
    dark:shadow-[0_8px_32px_rgba(0,0,0,0.30)]

    sm:px-5
  "
>
          {/* ==================================================
              LOGO
              ================================================== */}

          <a
            href="/"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2.5
            "
          >
            {/* Logo mark */}

            <span
              className="
                grid
                h-9
                w-9
                place-items-center
                rounded-xl

                bg-neutral-950

                text-lg
                font-bold
                text-white

                shadow-sm

                transition
                duration-200

                group-hover:scale-105
                group-hover:-rotate-2

                dark:bg-white
                dark:text-neutral-950
              "
            >
              g
            </span>

            {/* Logo text */}

            <span
              className="
                text-xl
                font-bold
                tracking-[-0.7px]

                text-neutral-900

                dark:text-white
              "
            >
              get<span className="text-indigo-500">Hack</span>
            </span>
          </a>

          {/* ==================================================
              DESKTOP NAVIGATION
              ================================================== */}

          <nav
            className="
              ml-8
              hidden
              items-center
              gap-1

              md:flex
            "
          >
            {/* Hackathons */}

            <a
              href="#hackathons"
              className="
                rounded-xl
                px-3
                py-2

                text-sm
                font-medium

                text-neutral-600

                transition
                duration-200

                hover:bg-neutral-100
                hover:text-neutral-950

                dark:text-neutral-400
                dark:hover:bg-white/5
                dark:hover:text-white
              "
            >
              Hackathons
            </a>

            {/* Find Teammates */}

            <a
              href="#teammates"
              className="
                rounded-xl
                px-3
                py-2

                text-sm
                font-medium

                text-neutral-600

                transition
                duration-200

                hover:bg-neutral-100
                hover:text-neutral-950

                dark:text-neutral-400
                dark:hover:bg-white/5
                dark:hover:text-white
              "
            >
              Find Teammates
            </a>

            {/* My Teams */}

            <a
              href="#my-teams"
              className="
                rounded-xl
                px-3
                py-2

                text-sm
                font-medium

                text-neutral-600

                transition
                duration-200

                hover:bg-neutral-100
                hover:text-neutral-950

                dark:text-neutral-400
                dark:hover:bg-white/5
                dark:hover:text-white
              "
            >
              My Teams
            </a>
          </nav>

          {/* ==================================================
              RIGHT SIDE
              ================================================== */}

          <div
            className="
              ml-auto
              flex
              items-center
              gap-1
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
                className="
                  relative
                  grid
                  h-10
                  w-10
                  place-items-center
                  rounded-xl

                  text-neutral-500

                  transition
                  duration-200

                  hover:bg-neutral-100
                  hover:text-neutral-900

                  dark:text-neutral-400
                  dark:hover:bg-white/5
                  dark:hover:text-white
                "
              >
                {/* Bell icon */}

                <svg
                  className="h-5 w-5"
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
                  className="
                    absolute
                    right-1
                    top-1

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
                    ring-white

                    dark:ring-neutral-950
                  "
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
                    top-[calc(100%+10px)]

                    w-[350px]

                    overflow-hidden
                    rounded-2xl

                    bg-white

                    shadow-[0_20px_60px_rgba(15,23,42,0.14)]

                    dark:bg-neutral-900
                    dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]
                  "
                >
                  {/* Header */}

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      px-4
                      py-4
                    "
                  >
                    <div>
                      <h3
                        className="
                          text-sm
                          font-bold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        Notifications
                      </h3>

                      <p
                        className="
                          mt-1
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
                        font-semibold
                        text-indigo-500
                        hover:text-indigo-600
                      "
                    >
                      Mark all read
                    </button>
                  </div>

                  {/* Notification */}

                  <button
                    type="button"
                    className="
                      flex
                      w-full
                      gap-3
                      px-4
                      py-3
                      text-left

                      transition

                      hover:bg-neutral-50

                      dark:hover:bg-white/5
                    "
                  >
                    <div
                      className="
                        grid
                        h-9
                        w-9
                        shrink-0
                        place-items-center
                        rounded-xl

                        bg-indigo-500/10
                        text-indigo-500
                      "
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                    </div>

                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        New team invitation
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-relaxed
                          text-neutral-500

                          dark:text-neutral-400
                        "
                      >
                        You received a new team invitation.
                      </p>

                      <span
                        className="
                          mt-1
                          block
                          text-[10px]
                          text-neutral-400
                        "
                      >
                        5 min ago
                      </span>
                    </div>
                  </button>

                  {/* Notification */}

                  <button
                    type="button"
                    className="
                      flex
                      w-full
                      gap-3
                      px-4
                      py-3
                      text-left

                      transition

                      hover:bg-neutral-50

                      dark:hover:bg-white/5
                    "
                  >
                    <div
                      className="
                        grid
                        h-9
                        w-9
                        shrink-0
                        place-items-center
                        rounded-xl

                        bg-emerald-500/10
                        text-emerald-500
                      "
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>

                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        Team member joined
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-neutral-500

                          dark:text-neutral-400
                        "
                      >
                        A new member joined your team.
                      </p>

                      <span
                        className="
                          mt-1
                          block
                          text-[10px]
                          text-neutral-400
                        "
                      >
                        32 min ago
                      </span>
                    </div>
                  </button>

                  {/* Notification */}

                  <button
                    type="button"
                    className="
                      flex
                      w-full
                      gap-3
                      px-4
                      py-3
                      text-left

                      transition

                      hover:bg-neutral-50

                      dark:hover:bg-white/5
                    "
                  >
                    <div
                      className="
                        grid
                        h-9
                        w-9
                        shrink-0
                        place-items-center
                        rounded-xl

                        bg-amber-500/10
                        text-amber-500
                      "
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                    </div>

                    <div>
                      <p
                        className="
                          text-xs
                          font-bold
                          text-neutral-900

                          dark:text-white
                        "
                      >
                        Hackathon deadline
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-neutral-500

                          dark:text-neutral-400
                        "
                      >
                        A saved hackathon closes soon.
                      </p>

                      <span
                        className="
                          mt-1
                          block
                          text-[10px]
                          text-neutral-400
                        "
                      >
                        2 hrs ago
                      </span>
                    </div>
                  </button>

                  {/* View all */}

                  <button
                    type="button"
                    className="
                      w-full
                      px-4
                      py-3

                      text-xs
                      font-bold
                      text-indigo-500

                      transition

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
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl

                text-neutral-500

                transition
                duration-200

                hover:bg-neutral-100
                hover:text-neutral-900

                dark:text-neutral-400
                dark:hover:bg-white/5
                dark:hover:text-white
              "
            >
              {darkMode ? (
                /* SUN */

                <svg
                  className="h-5 w-5"
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
                  className="h-5 w-5"
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

            <a
              href="#login"
              className="
                hidden
                min-h-10
                items-center
                justify-center

                rounded-xl

                bg-neutral-950

                px-4

                text-sm
                font-semibold
                text-white

                transition
                duration-200

                hover:bg-neutral-800

                dark:bg-white
                dark:text-neutral-950
                dark:hover:bg-neutral-200

                sm:flex
              "
            >
              Log in
            </a>

            {/* ==================================================
                MOBILE MENU BUTTON
                ================================================== */}

            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              className="
                grid
                h-10
                w-10
                place-items-center
                rounded-xl

                text-neutral-600

                transition

                hover:bg-neutral-100

                dark:text-neutral-300
                dark:hover:bg-white/5

                md:hidden
              "
            >
              {mobileMenuOpen ? (
                /* CLOSE */

                <svg
                  className="h-5 w-5"
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
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ==================================================
            MOBILE NAVIGATION
            ================================================== */}

        {mobileMenuOpen && (
          <nav
            className="
              mx-auto
              mt-2
              max-w-7xl

              rounded-2xl

              bg-white/90

              p-2

              shadow-[0_12px_35px_rgba(15,23,42,0.08)]

              backdrop-blur-xl

              dark:bg-neutral-950/90
              dark:shadow-[0_12px_35px_rgba(0,0,0,0.3)]

              md:hidden
            "
          >
            <a
              href="#hackathons"
              onClick={() => setMobileMenuOpen(false)}
              className="
                block
                rounded-xl
                px-4
                py-3

                text-sm
                font-medium

                text-neutral-700

                hover:bg-neutral-100

                dark:text-neutral-300
                dark:hover:bg-white/5
              "
            >
              Hackathons
            </a>

            <a
              href="#teammates"
              onClick={() => setMobileMenuOpen(false)}
              className="
                block
                rounded-xl
                px-4
                py-3

                text-sm
                font-medium

                text-neutral-700

                hover:bg-neutral-100

                dark:text-neutral-300
                dark:hover:bg-white/5
              "
            >
              Find Teammates
            </a>

            <a
              href="#my-teams"
              onClick={() => setMobileMenuOpen(false)}
              className="
                block
                rounded-xl
                px-4
                py-3

                text-sm
                font-medium

                text-neutral-700

                hover:bg-neutral-100

                dark:text-neutral-300
                dark:hover:bg-white/5
              "
            >
              My Teams
            </a>

            <a
              href="#login"
              onClick={() => setMobileMenuOpen(false)}
              className="
                mt-1
                block
                rounded-xl

                bg-neutral-950

                px-4
                py-3

                text-center
                text-sm
                font-semibold
                text-white

                dark:bg-white
                dark:text-neutral-950
              "
            >
              Log in
            </a>
          </nav>
        )}
      </header>
    </>
  );
}

export default Header;