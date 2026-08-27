// ---------------------------------------------------------------------------
// LoginPage.jsx — Production Authentication Login Page
// Features a bounded authentication card with local Day/Night theme toggle.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInput from "../../components/auth/AuthInput";
import { useAuth } from "../../context/useAuth";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Local card theme state (does NOT change global theme or page background)
  const [isCardDark, setIsCardDark] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = "Please enter your email address.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Please enter your password.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError("");
    setSocialNotice("");

    if (!validate()) return;

    setIsLoading(true);

    try {
      const loggedUser = await login({ email, password });
      setIsLoading(false);

      // Redirect based on account role or redirect query parameter
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get("redirect");

      if (loggedUser?.role === "organizer") {
        navigate("/organizer");
      } else if (redirectUrl) {
        navigate(redirectUrl);
      } else {
        navigate("/hackathons");
      }
    } catch (err) {
      setIsLoading(false);
      setGeneralError(
        err.message || "Invalid email or password. Please check your credentials and try again."
      );
    }
  };

  const handleSocialClick = (provider) => {
    setSocialNotice(`${provider} sign in is not configured in this demo environment.`);
    setTimeout(() => setSocialNotice(""), 3500);
  };

  return (
    <div
      className={`
        relative
        w-full
        rounded-2xl
        border
        p-6
        sm:p-8
        transition-all
        duration-200
        ${
          isCardDark
            ? "border-neutral-800 bg-neutral-900 text-white shadow-xl"
            : "border-neutral-200/90 bg-white text-neutral-900 shadow-sm"
        }
      `}
    >
      {/* ── Local Card Day/Night Theme Toggle (Top Right inside Card) ── */}
      <button
        type="button"
        onClick={() => setIsCardDark((prev) => !prev)}
        aria-label={isCardDark ? "Switch to light card theme" : "Switch to dark card theme"}
        title={isCardDark ? "Switch to light card theme" : "Switch to dark card theme"}
        className={`
          absolute
          right-4
          top-4
          grid
          h-8
          w-8
          place-items-center
          rounded-lg
          border
          transition-colors
          duration-150
          ${
            isCardDark
              ? "border-neutral-800 bg-neutral-950 text-amber-400 hover:bg-neutral-800"
              : "border-neutral-200 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
          }
        `}
      >
        {isCardDark ? (
          /* SUN ICON */
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* MOON ICON */
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      <div className="space-y-6">
        {/* Card Heading */}
        <div className="text-center space-y-1 pt-1">
          <h1
            className={`text-2xl font-bold tracking-tight sm:text-3xl ${
              isCardDark ? "text-white" : "text-neutral-900"
            }`}
          >
            Sign in
          </h1>
          <p
            className={`text-xs font-medium ${
              isCardDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            Welcome back to getHack
          </p>
        </div>

        {/* Error & Notice Banners */}
        {generalError && (
          <div
            className={`rounded-xl border p-3.5 text-xs font-semibold ${
              isCardDark
                ? "border-red-900/60 bg-red-950/60 text-red-300"
                : "border-red-200/80 bg-red-50 text-red-600"
            }`}
          >
            {generalError}
          </div>
        )}

        {socialNotice && (
          <div
            className={`rounded-xl border p-3.5 text-xs font-semibold ${
              isCardDark
                ? "border-amber-900/60 bg-amber-950/60 text-amber-300"
                : "border-amber-200/80 bg-amber-50 text-amber-700"
            }`}
          >
            {socialNotice}
          </div>
        )}

        {/* Main Login Form */}
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
            error={errors.email}
            isDark={isCardDark}
          />

          <div>
            <AuthInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              error={errors.password}
              isDark={isCardDark}
            />
            <div className="mt-1.5 text-right">
              <Link
                to="/forgot-password"
                className={`text-xs font-medium transition-colors ${
                  isCardDark
                    ? "text-indigo-400 hover:text-indigo-300"
                    : "text-indigo-600 hover:text-indigo-700"
                }`}
              >
                Forgot password?
              </Link>
            </div>
          </div>

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
            "
          >
            {isLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div
            className={`w-full border-t ${
              isCardDark ? "border-neutral-800" : "border-neutral-200"
            }`}
          />
          <span
            className={`absolute px-3 text-[11px] font-medium uppercase tracking-wider ${
              isCardDark
                ? "bg-neutral-900 text-neutral-500"
                : "bg-white text-neutral-400"
            }`}
          >
            or
          </span>
        </div>

        {/* Social Login Secondary Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleSocialClick("Google")}
            className={`
              flex
              h-10
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-lg
              border
              px-4
              text-xs
              font-semibold
              transition-colors
              ${
                isCardDark
                  ? "border-neutral-800 bg-neutral-950 text-neutral-200 hover:bg-neutral-800 hover:text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              }
            `}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialClick("GitHub")}
            className={`
              flex
              h-10
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-lg
              border
              px-4
              text-xs
              font-semibold
              transition-colors
              ${
                isCardDark
                  ? "border-neutral-800 bg-neutral-950 text-neutral-200 hover:bg-neutral-800 hover:text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              }
            `}
          >
            <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Footer Link inside Card */}
        <div
          className={`pt-2 text-center text-xs ${
            isCardDark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          <span>Don&apos;t have an account? </span>
          <Link
            to="/signup"
            className={`font-semibold transition-colors ${
              isCardDark
                ? "text-indigo-400 hover:text-indigo-300"
                : "text-indigo-600 hover:text-indigo-700"
            }`}
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
