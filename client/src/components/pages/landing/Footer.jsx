function Footer() {
  return (
    <footer
      id="footer"
      className="border-t border-neutral-200 bg-white px-6 py-16 transition-colors dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-7xl">
        {/* Main Footer Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          {/* Brand Column (Spans 2 on lg) */}
          <div className="lg:col-span-2">
            <a
              href="/"
              className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white"
            >
              get<span className="text-indigo-500">Hack</span>
            </a>

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
                <a
                  href="#hackathons"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Hackathons
                </a>
              </li>
              <li>
                <a
                  href="#teammates"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Find Teammates
                </a>
              </li>
              <li>
                <a
                  href="#why-gethack"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  AI Assistant
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Team Builder
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Team Chat
                </a>
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
                <a
                  href="#how-it-works"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  How it Works
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="#why-gethack"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  About getHack
                </a>
              </li>
              <li>
                <a
                  href="#footer"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Community */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Community
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 transition-colors hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                >
                  X / Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Area */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 sm:flex-row dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            © 2026 getHack. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-xs text-neutral-500 dark:text-neutral-400">
            <a
              href="#privacy"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
