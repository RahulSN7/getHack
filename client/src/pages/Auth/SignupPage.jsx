// ---------------------------------------------------------------------------
// SignupPage.jsx — Production Email OTP Registration Page
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

function SignupPage() {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp } = useAuth();

  // Local card theme state
  const [isCardDark, setIsCardDark] = useState(false);

  // Registration state
  const [step, setStep] = useState(1); // 1 = Details Input | 2 = OTP Verification
  const [role, setRole] = useState("Participant"); // Participant | Organizer
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  const validateStep1 = () => {
    const errs = {};

    if (!name.trim()) {
      errs.name = "Please enter your name.";
    }

    if (!email.trim()) {
      errs.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Send OTP to Email
  const handleSendOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    setGeneralError("");

    if (!validateStep1()) return;

    setIsLoading(true);

    try {
      const selectedRole = role.toLowerCase();
      await sendOtp({ email: email.trim(), role: selectedRole });
      setIsLoading(false);
      setStep(2);
      setResendCooldown(30); // Start 30s resend cooldown
    } catch (err) {
      setIsLoading(false);
      setGeneralError(err.message || "Unable to send verification code. Please try again.");
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setGeneralError("");
    setIsResending(true);

    try {
      const selectedRole = role.toLowerCase();
      await sendOtp({ email: email.trim(), role: selectedRole });
      setIsResending(false);
      setResendCooldown(30);
      setOtp("");
    } catch (err) {
      setIsResending(false);
      setGeneralError(err.message || "Unable to send verification code. Please try again.");
    }
  };

  // Step 2: Verify OTP & Create Account
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
      const selectedRole = role.toLowerCase();
      const newUser = await verifyOtp({
        name: name.trim(),
        email: email.trim(),
        otp: cleanOtp,
        role: selectedRole,
      });
      setIsLoading(false);

      if (newUser?.role === "organizer") {
        navigate("/organizer");
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
            {step === 1 ? "Create an account" : "Verify your email"}
          </h1>
          <p
            className={`text-xs font-medium ${
              isCardDark ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {step === 1 ? (
              "Join getHack to discover hackathons and find teammates"
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

        {/* STEP 1: DETAILS & ROLE SELECTION FORM */}
        {step === 1 && (
          <form onSubmit={handleSendOtpSubmit} noValidate className="space-y-4">
            {/* Role Selection Tabs */}
            <div>
              <label
                className={`mb-1.5 block text-xs font-semibold ${
                  isCardDark ? "text-neutral-300" : "text-neutral-700"
                }`}
              >
                I want to join as
              </label>
              <div
                className={`grid grid-cols-2 rounded-xl border p-1 ${
                  isCardDark
                    ? "border-neutral-800 bg-neutral-950"
                    : "border-neutral-200 bg-neutral-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setRole("Participant")}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    role === "Participant"
                      ? isCardDark
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-neutral-900 shadow-xs"
                      : isCardDark
                      ? "text-neutral-400 hover:text-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Participant
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Organizer")}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    role === "Organizer"
                      ? isCardDark
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-neutral-900 shadow-xs"
                      : isCardDark
                      ? "text-neutral-400 hover:text-neutral-200"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Organizer
                </button>
              </div>
            </div>

            <AuthInput
              id="name"
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              autoComplete="name"
              error={errors.name}
              isDark={isCardDark}
            />

            <AuthInput
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              autoComplete="email"
              error={errors.email}
              isDark={isCardDark}
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
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
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
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Verify & Create Account</span>
              )}
            </button>

            {/* Resend OTP & Back to details links */}
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
                  ← Change account details
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Card Footer Link */}
        <div className="border-t border-neutral-100 pt-4 text-center text-xs dark:border-neutral-800">
          <p className={isCardDark ? "text-neutral-400" : "text-neutral-500"}>
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
