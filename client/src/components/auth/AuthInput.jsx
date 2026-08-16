// ---------------------------------------------------------------------------
// AuthInput.jsx — Reusable Accessible Form Control for Auth Pages
// Supports card-level theme adaptation, password visibility toggle & error text.
// ---------------------------------------------------------------------------

import { useState } from "react";

function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  autoComplete,
  error,
  isDark = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className={`block text-xs font-semibold ${
            isDark ? "text-neutral-200" : "text-neutral-800"
          }`}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      </div>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`
            h-10
            w-full
            rounded-lg
            border
            px-3.5
            text-sm
            outline-none
            transition-all
            duration-150
            ${isPasswordType ? "pr-10" : "pr-3.5"}
            ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : isDark
                ? "border-neutral-800 bg-neutral-950 text-white placeholder-neutral-500 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
                : "border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            }
          `}
        />

        {/* Password Visibility Toggle */}
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={`
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              rounded
              p-1
              transition-colors
              ${
                isDark
                  ? "text-neutral-400 hover:text-white"
                  : "text-neutral-400 hover:text-neutral-600"
              }
            `}
          >
            {showPassword ? (
              /* Eye Slash / Hide */
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              /* Eye / Show */
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export default AuthInput;
