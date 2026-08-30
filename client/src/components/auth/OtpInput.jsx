// ---------------------------------------------------------------------------
// OtpInput.jsx — 6-Digit Interactive OTP Input Component
// Supports auto-advance, backspace navigation, paste functionality, and dark mode.
// ---------------------------------------------------------------------------

import { useRef, useEffect } from "react";

function OtpInput({ value = "", onChange, length = 6, disabled = false, error = false, onComplete }) {
  const inputRefs = useRef([]);

  // Convert incoming string value into array of individual characters
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    // Focus first empty input on initial mount if not disabled
    if (!disabled && inputRefs.current[0] && value.length === 0) {
      inputRefs.current[0].focus();
    }
  }, [disabled, value.length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!val) return;

    // Filter out non-numeric characters
    const numericChar = val.replace(/\D/g, "").slice(-1);
    if (!numericChar) return;

    const newDigits = [...digits];
    newDigits[index] = numericChar;
    const newOtp = newDigits.join("");

    onChange(newOtp);

    // Auto-advance to next input box
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Trigger onComplete callback if 6 digits are complete
    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];

      if (newDigits[index]) {
        // Clear current index digit if present
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move to previous index box and clear it
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        if (inputRefs.current[index - 1]) {
          inputRefs.current[index - 1].focus();
        }
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const numericDigits = pastedText.replace(/\D/g, "").slice(0, length);

    if (numericDigits) {
      onChange(numericDigits);

      // Focus last pasted digit or next empty box
      const focusIndex = Math.min(numericDigits.length, length - 1);
      inputRefs.current[focusIndex]?.focus();

      if (numericDigits.length === length && onComplete) {
        onComplete(numericDigits);
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          autoComplete="one-time-code"
          className={`
            h-12
            w-11
            sm:w-12
            rounded-xl
            border
            text-center
            text-lg
            font-bold
            tracking-wider
            transition-all
            duration-150
            outline-hidden
            ${
              error
                ? "border-red-500 bg-red-50/50 text-red-900 focus:ring-2 focus:ring-red-500 dark:border-red-500/80 dark:bg-red-950/20 dark:text-red-300"
                : "border-neutral-300 bg-white text-neutral-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
            }
            ${disabled ? "cursor-not-allowed opacity-50" : ""}
          `}
        />
      ))}
    </div>
  );
}

export default OtpInput;
