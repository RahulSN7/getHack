// ---------------------------------------------------------------------------
// DeadlineDisplay — smart deadline & live countdown component
// Updates automatically based on remaining time with optimized timers.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getDeadlineInfo } from "../../../utils/deadlineUtils";

function getStatusClasses(status) {
  switch (status) {
    case "normal":
      return "text-neutral-600 dark:text-neutral-400 font-medium";
    case "approaching":
    case "urgent":
      return "text-amber-600 dark:text-amber-400 font-semibold";
    case "critical":
      return "text-rose-600 dark:text-rose-400 font-semibold";
    case "closed":
    case "invalid":
    default:
      return "text-neutral-400 dark:text-neutral-500 font-medium";
  }
}

export function DeadlineDisplay({
  registrationDeadline,
  registrationOpen = true,
}) {
  const [, setTick] = useState(0);
  const info = getDeadlineInfo(registrationDeadline, registrationOpen);

  useEffect(() => {
    // If no interval is needed (>24h or closed/invalid), do not set timer
    if (!info.updateIntervalMs) return;

    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, info.updateIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [registrationDeadline, registrationOpen, info.updateIntervalMs]);

  const styleClass = getStatusClasses(info.status);

  return (
    <span
      className={`shrink-0 text-xs transition-colors duration-150 ${styleClass}`}
    >
      {info.text}
    </span>
  );
}

export default DeadlineDisplay;
