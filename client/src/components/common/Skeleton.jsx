import React from "react";

/**
 * Reusable Skeleton loader component for getHack
 * Supports light/dark mode styling, customizable dimensions, and accessible ARIA attributes.
 */
export default function Skeleton({
  className = "",
  width,
  height,
  rounded = "rounded-xl",
  inline = false,
  ...props
}) {
  const Component = inline ? "span" : "div";

  return (
    <Component
      role="status"
      aria-label="Loading..."
      aria-busy="true"
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
      className={`
        animate-pulse
        bg-neutral-200/80
        dark:bg-neutral-800/80
        ${rounded}
        ${className}
      `}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </Component>
  );
}
