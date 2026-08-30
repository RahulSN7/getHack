// ---------------------------------------------------------------------------
// LoginPage.jsx — Production Email OTP Authentication Login Page
// 2-Step OTP Verification Flow with zero password fields & local Day/Night theme.
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInput from "../../components/auth/AuthInput";
import OtpInput from "../../components/auth/OtpInput";
import { useAuth } from "../../context/useAuth";

// Helper function to partially mask email address (e.g. rahul@gmail.com -> r***l@gmail.com)
function maskEmail(emailStr) {
  if (!emailStr || !emailStr.includes("@")) return emailStr;
  const [local, domain] = emailStr.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function LoginPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, googleAuth } = useAuth();

  // Local card theme state
  const [isCardDark, setIsCardDark] = useState(false);

  // Authentication state
  const [step, setStep] = useState(1); // 1 = Email Input | 2 = OTP Verification
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setGeneralError("");
    setIsGoogleLoading(true);

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt(async (notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            window.location.href = "/api/auth/google";
          }
        });
      } catch {
        window.location.href = "/api/auth/google";
      }
    } else {
      window.location.href = "/api/auth/google";
    }
  };

  // Cooldown countdown timer effect for OTP resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

function isValidEmailFormat(emailStr) {
  if (!emailStr || typeof emailStr !== "string") return false;
  const trimmed = emailStr.trim().toLowerCase();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  if (trimmed.includes("..")) return false;
  const parts = trimmed.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.startsWith(".") || local.endsWith(".")) return false;
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!domain || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (!domain.includes(".")) return false;
  const domainParts = domain.split(".");
  if (domainParts.some((label) => !label || label.length === 0 || label.startsWith("-") || label.endsWith("-"))) {
    return false;
  }
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  return true;
}

  const validateEmailStep = () => {
    const errs = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errs.email = "Please enter your email address.";
    } else if (!isValidEmailFormat(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Send OTP to Email
  const handleSendOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    setGeneralError("");

    if (!validateEmailStep()) return;

    setIsLoading(true);

    try {
      await sendOtp({ email: email.trim() });
      setIsLoading(false);
      setStep(2);
      setResendCooldown(30); // Start 30s resend cooldown
    } catch (err) {
      setIsLoading(false);
      setGeneralError(err.message || "We couldn't send the verification code. Please try again.");
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setGeneralError("");
    setIsResending(true);

    try {
      await sendOtp({ email: email.trim() });
      setIsResending(false);
      setResendCooldown(30);
      setOtp("");
    } catch (err) {
      setIsResending(false);
      setGeneralError(err.message || "We couldn't send the verification code. Please try again.");
    }
  };

  // Step 2: Verify OTP & Authenticate User
  const handleVerifyOtpSubmit = async (e, otpCode = otp) => {
    if (e) e.preventDefault();
    setGeneralError("");

    const cleanOtp = (otpCode || otp).trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setGeneralError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const loggedUser = await verifyOtp({ email: email.trim(), otp: cleanOtp });
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
      setGeneralError(err.message || "Incorrect verification code. Please try again.");
    }
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
      {/* ── Local Card Day/Night Theme Toggle ── */}
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
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
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
            {step === 1 ? "Sign in" : "Verify your email"}
          </h1>
          <p
            className={`text-xs font-medium ${
              isCardDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {step === 1 ? (
              "Welcome back to getHack"
            ) : (
              <span>
                We sent a 6-digit verification code to{" "}
                <span className={`font-semibold ${isCardDark ? "text-neutral-200" : "text-neutral-800"}`}>
                  {maskEmail(email)}
                </span>
              </span>
            )}
          </p>
        </div>

        {/* Error Banner */}
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

        {/* STEP 1: EMAIL ENTRY FORM */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Google Authentication Button */}
            <button
              type="button"
              disabled={isGoogleLoading || isLoading}
              onClick={handleGoogleSignIn}
              className={`
                flex
                h-10
                w-full
                items-center
                justify-center
                gap-2.5
                rounded-lg
                border
                text-xs
                font-semibold
                shadow-2xs
                transition-colors
                duration-150
                ${
                  isCardDark
                    ? "border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-700"
                    : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400"
                }
                disabled:cursor-not-allowed
                disabled:opacity-60
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
              <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* OR Divider */}
            <div className="relative flex items-center justify-center pt-1 pb-1">
              <div className={`w-full border-t ${isCardDark ? "border-neutral-800" : "border-neutral-200"}`} />
              <span className={`absolute px-3 text-[10px] font-bold uppercase tracking-wider ${isCardDark ? "text-neutral-500 bg-neutral-900" : "text-neutral-400 bg-white"}`}>
                OR
              </span>
            </div>

            <form onSubmit={handleSendOtpSubmit} noValidate className="space-y-4">
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

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
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
                    <span>Sending code...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION FORM */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtpSubmit} noValidate className="space-y-5">
            <div>
              <label
                className={`mb-2 block text-xs font-semibold ${
                  isCardDark ? "text-neutral-300" : "text-neutral-700"
                }`}
              >
                Enter 6-digit Code
              </label>
              <OtpInput
                value={otp}
                onChange={setOtp}
                length={6}
                disabled={isLoading}
                error={!!generalError}
                onComplete={(code) => handleVerifyOtpSubmit(null, code)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="
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
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify OTP</span>
              )}
            </button>

            {/* Resend OTP & Back to email links */}
            <div className="space-y-2 pt-2 text-center text-xs">
              <div className={isCardDark ? "text-neutral-400" : "text-neutral-500"}>
                Didn&apos;t receive the code?{" "}
                {resendCooldown > 0 ? (
                  <span className="font-semibold text-neutral-400">
                    Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {isResending ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setGeneralError("");
                  }}
                  className="font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                >
                  ← Change email address
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Card Footer Link */}
        <div className="border-t border-neutral-100 pt-4 text-center text-xs dark:border-neutral-800">
          <p className={isCardDark ? "text-neutral-400" : "text-neutral-500"}>
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
