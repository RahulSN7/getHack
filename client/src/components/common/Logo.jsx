import React from "react";

/**
 * Official getHack Logo Component
 * 
 * Props:
 * - variant: "auto" (adapts to light/dark mode), "dark" (dark text for light bg), "light" (white text for dark bg)
 * - iconOnly: boolean (if true, renders emblem icon only)
 * - className: CSS classes for dimensions/styling (default: "h-7 w-auto")
 * - alt: alt text description
 */
export default function Logo({
  variant = "auto",
  iconOnly = false,
  className = "h-7 w-auto",
  alt = "getHack Logo",
}) {
  if (iconOnly) {
    return (
      <img
        src="/gethack-icon.png"
        alt={alt}
        className={`object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      />
    );
  }

  if (variant === "light") {
    return (
      <img
        src="/gethack-logo-white.png"
        alt={alt}
        className={`object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      />
    );
  }

  if (variant === "dark") {
    return (
      <img
        src="/gethack-logo.png"
        alt={alt}
        className={`object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      />
    );
  }

  return (
    <span className="inline-flex items-center">
      <img
        src="/gethack-logo.png"
        alt={alt}
        className={`object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 dark:hidden ${className}`}
      />
      <img
        src="/gethack-logo-white.png"
        alt={alt}
        className={`object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 hidden dark:block ${className}`}
      />
    </span>
  );
}
