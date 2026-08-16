// ---------------------------------------------------------------------------
// ForgotPasswordPage.jsx — Password Reset Request Page
// Standardized getHack design system inside standalone AuthLayout.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";
import AuthInput from "../../components/auth/AuthInput";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 800);
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-sm transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="space-y-6">
        {/* Heading */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            Reset password
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
            Enter your email address and we&apos;ll send you instructions to reset your password.
          </p>
        </div>

        {/* Success Notification */}
        {isSubmitted ? (
          <div className="space-y-4 rounded-xl border border-indigo-200/80 bg-indigo-50/80 p-4 text-center dark:border-indigo-900/50 dark:bg-indigo-950/60">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 leading-relaxed">
              If an account exists for <span className="font-bold">{email}</span>, password reset instructions have been sent.
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Please check your inbox and spam folder.
            </p>
            <Link
              to="/login"
              className="inline-block pt-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              ← Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthInput
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              error={error}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="
                mt-2
                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-indigo-600
                px-4
                text-xs
                font-semibold
                text-white
                shadow-xs
                transition-colors
                duration-150
                hover:bg-indigo-500
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:bg-indigo-500
                dark:hover:bg-indigo-400
              "
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send reset instructions</span>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        {!isSubmitted && (
          <div className="pt-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              ← Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
