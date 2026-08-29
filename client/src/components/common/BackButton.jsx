// ---------------------------------------------------------------------------
// client/src/components/common/BackButton.jsx
// Reusable Dynamic Back Button for getHack (Profile, Hackathon Details, Group Info, etc.)
// Supports standard button card variant (default) and text link variant (`variant="link"`).
// ---------------------------------------------------------------------------

import { useNavigate, useLocation } from "react-router-dom";

export default function BackButton({
  fallbackPath = "/",
  className = "",
  variant = "default",
}) {
  const navigate = useNavigate();
  const routerLocation = useLocation();

  const handleBack = () => {
    if (routerLocation.state?.from) {
      navigate(routerLocation.state.from);
    } else if (window.history.length > 1 && routerLocation.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  const isLinkVariant = variant === "link" || variant === "minimal" || variant === "plain";

  const defaultStyles = `
    group
    inline-flex
    items-center
    gap-2
    rounded-lg
    border
    border-neutral-200
    bg-white
    px-3.5
    py-2
    text-xs
    font-semibold
    text-neutral-700
    shadow-2xs
    transition-colors
    duration-150
    hover:border-neutral-300
    hover:bg-neutral-50
    hover:text-neutral-950
    dark:border-neutral-800
    dark:bg-neutral-900
    dark:text-neutral-300
    dark:hover:border-neutral-700
    dark:hover:bg-neutral-800/80
    dark:hover:text-white
    cursor-pointer
  `;

  const linkStyles = `
    group
    inline-flex
    items-center
    gap-1.5
    bg-transparent
    p-0
    text-xs
    font-semibold
    text-neutral-600
    transition-colors
    duration-150
    hover:bg-transparent
    hover:text-neutral-900
    dark:bg-transparent
    dark:text-neutral-400
    dark:hover:bg-transparent
    dark:hover:text-white
    cursor-pointer
  `;

  const selectedStyles = isLinkVariant ? linkStyles : defaultStyles;

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${selectedStyles.trim()} ${className}`.trim()}
    >
      <svg
        className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      <span>Back</span>
    </button>
  );
}
