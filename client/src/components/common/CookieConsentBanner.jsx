import React, { useState, useEffect, useRef } from "react";

const CONSENT_KEY = "gethack_cookie_consent";

/**
 * CookieConsentBanner — Professional, Accessible, Non-blocking Cookie Consent Banner
 *
 * Appears only when the user has not made a cookie choice yet.
 * Persists user preference ('accepted' or 'rejected') in localStorage under `gethack_cookie_consent`.
 * Broadcasts rendered height via custom events so overlapping UI (e.g. AI launcher button) can position itself cleanly.
 */
export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const bannerRef = useRef(null);
  const isClosingRef = useRef(false);

  // Check prefers-reduced-motion accessibility setting
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Check stored consent on mount
  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(CONSENT_KEY);
      if (!storedConsent) {
        setShowBanner(true);
      }
    } catch {
      // Default to false if storage is inaccessible
      setShowBanner(false);
    }
  }, []);

  // Trigger pop-up enter animation after banner is mounted in DOM
  useEffect(() => {
    if (showBanner && !isClosingRef.current) {
      const timer = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [showBanner]);

  // Measure rendered banner height dynamically and broadcast via custom event
  useEffect(() => {
    if (!showBanner || !bannerRef.current) return;

    const notifyHeight = () => {
      if (bannerRef.current && !isClosingRef.current) {
        const isSm = window.innerWidth >= 640;
        const bottomMargin = isSm ? 24 : 16;
        const height = bannerRef.current.offsetHeight + bottomMargin;
        window.dispatchEvent(
          new CustomEvent("gethack:cookie-banner-resize", {
            detail: { height, visible: isVisible },
          })
        );
      }
    };

    notifyHeight();

    const resizeObserver = new ResizeObserver(() => {
      notifyHeight();
    });

    resizeObserver.observe(bannerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [showBanner, isVisible]);

  const handleChoice = (choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Ignore storage write error
    }

    isClosingRef.current = true;
    setIsVisible(false);

    // Immediately notify AI button to return to normal position
    window.dispatchEvent(
      new CustomEvent("gethack:cookie-banner-resize", {
        detail: { height: 0, visible: false },
      })
    );

    if (prefersReducedMotion) {
      setShowBanner(false);
    } else {
      // Fallback timeout to unmount if transitionend doesn't fire
      setTimeout(() => {
        setShowBanner(false);
      }, 350);
    }
  };

  const handleTransitionEnd = (e) => {
    if (e.target === bannerRef.current && isClosingRef.current) {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <aside
      ref={bannerRef}
      role="region"
      aria-label="Cookie consent banner"
      onTransitionEnd={handleTransitionEnd}
      className={`
        fixed
        bottom-4
        left-4
        right-4
        z-40
        mx-auto
        max-w-md
        w-[calc(100%-2rem)]
        sm:w-auto
        rounded-2xl
        border
        border-neutral-200/90
        bg-white/95
        p-4
        sm:p-5
        shadow-xl
        backdrop-blur-md
        dark:border-neutral-800/90
        dark:bg-neutral-900/95
        sm:bottom-6
        sm:left-auto
        sm:right-6
        will-change-transform
        ${prefersReducedMotion ? "transition-none" : "transition-all duration-300 ease-out"}
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"}
      `}
    >
      <div className="space-y-3">
        {/* Header & Icon */}
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <path d="M8.5 8.5v.01" />
              <path d="M16 15.5v.01" />
              <path d="M12 12v.01" />
              <path d="M11 17v.01" />
              <path d="M7 14v.01" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              We use cookies
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              We use cookies to help keep getHack working properly and improve your experience. By continuing, you can choose whether to allow optional cookies.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleChoice("rejected")}
            className="
              flex-1
              sm:flex-initial
              rounded-xl
              border
              border-neutral-200
              bg-white
              px-4
              py-2
              text-xs
              font-semibold
              text-neutral-700
              shadow-2xs
              transition-colors
              hover:bg-neutral-50
              focus-visible:outline-2
              focus-visible:outline-indigo-500
              dark:border-neutral-700
              dark:bg-neutral-800
              dark:text-neutral-200
              dark:hover:bg-neutral-700
            "
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="
              flex-1
              sm:flex-initial
              rounded-xl
              bg-[#2563EB]
              px-5
              py-2
              text-xs
              font-semibold
              text-white
              shadow-2xs
              transition-colors
              hover:bg-[#1d4ed8]
              focus-visible:outline-2
              focus-visible:outline-indigo-500
              dark:bg-[#2563EB]
              dark:hover:bg-[#1d4ed8]
            "
          >
            Accept
          </button>
        </div>
      </div>
    </aside>
  );
}

