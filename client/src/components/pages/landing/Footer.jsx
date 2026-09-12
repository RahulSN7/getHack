import { Link, useLocation, useNavigate } from "react-router-dom";

function Footer() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollTo = (id) => {
    if (location.pathname === "/") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    navigate(`/#${id}`);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <footer
      id="footer"
      className="border-t border-neutral-200 bg-white px-6 py-16 transition-colors dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-7xl">
        {/* Main Footer Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand Column (Spans 2 on lg) */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white"
            >
              get<span className="text-indigo-500">Hack</span>
            </Link>

            <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              Discover hackathons. Find your people. Build something meaningful.
            </p>

            <div className="mt-5 flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Product
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/hackathons"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Hackathons
                </Link>
              </li>
              <li>
                <Link
                  to="/teammates"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Find Teammates
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("gethack:open-ai"));
                    handleScrollTo("why-gethack");
                  }}
                  className="text-left text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  AI Assistant
                </button>
              </li>
              <li>
                <Link
                  to="/create-team"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Team Builder
                </Link>
              </li>
              <li>
                <Link
                  to="/messages"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Team Chat
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Resources
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo("how-it-works")}
                  className="text-left text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  How it Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo("faq")}
                  className="text-left text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo("why-gethack")}
                  className="text-left text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white cursor-pointer"
                >
                  About getHack
                </button>
              </li>
              <li>
                <a
                  href="mailto:contact@gethack.com"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Area */}
        <div className="mt-14 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            © 2026 getHack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
