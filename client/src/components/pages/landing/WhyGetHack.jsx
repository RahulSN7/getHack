import { useState } from "react";

const journeySteps = [
  {
    id: "01",
    phase: "Discover",
    title: "Find hackathons aligned with your stack",
    description:
      "Filter opportunities by specific technologies, domains, location, difficulty level, submission deadlines, and prize pools to find what fits you best.",
    tags: ["Tech Stack", "Domain", "Format & Location", "Prizes"],
    badge: "01 / Discover",
  },
  {
    id: "02",
    phase: "Match",
    title: "Skill-based teammate discovery",
    description:
      "Stop searching blindly. getHack maps required project capabilities against member skills to surface complementary teammates automatically.",
    tags: ["Skill Gap Analysis", "Role Matching", "Compatibility"],
    badge: "02 / Match",
  },
  {
    id: "03",
    phase: "Analyze",
    isAiSpotlight: true,
    title: "AI-Powered Hackathon & Team Intelligence",
    description:
      "Our built-in AI Assistant analyzes complex hackathon rules, evaluates team composition, pinpoints missing skill roles, and recommends ideal team matches.",
    tags: ["Rule Parsing", "Skill Gap Detection", "Smart Recommendations"],
    badge: "03 / AI Intelligence",
  },
  {
    id: "04",
    phase: "Build",
    title: "Structured team formation",
    description:
      "Form official project teams, lock in member commitments, assign roles, and align on technical goals before the hackathon clock starts.",
    tags: ["Team Roster", "Role Assignment", "Goal Alignment"],
    badge: "04 / Build",
  },
  {
    id: "05",
    phase: "Collaborate",
    title: "Seamless project coordination",
    description:
      "Keep all hackathon communication, resource sharing, and execution updates centralized with dedicated team chat and task spaces.",
    tags: ["Team Workspace", "Live Chat", "Resource Hub"],
    badge: "05 / Collaborate",
  },
];

function WhyGetHack() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="why-gethack" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header section */}
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            WHY GETHACK
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl dark:text-white">
            More than a hackathon directory.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Find the right opportunity, build the right team, and turn your idea into something worth shipping.
          </p>
        </div>

        {/* Journey Progress Bar */}
        <div className="mt-12 overflow-x-auto pb-4 pt-2 no-scrollbar">
          <div className="flex items-center gap-2 min-w-max border-b border-neutral-200 pb-4 dark:border-neutral-800">
            {journeySteps.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    activeStep === idx
                      ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                  }
                `}
              >
                <span className="text-xs opacity-70">{step.id}</span>
                <span>{step.phase}</span>
                {idx < journeySteps.length - 1 && (
                  <span className="ml-2 text-neutral-300 dark:text-neutral-700">→</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Product Storytelling Layout */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column: Interactive Steps List */}
          <div className="space-y-4 lg:col-span-5">
            {journeySteps.map((step, idx) => (
              <div
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`
                  group cursor-pointer rounded-xl border p-5 transition-all duration-200
                  ${
                    activeStep === idx
                      ? step.isAiSpotlight
                        ? "border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm"
                        : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 shadow-sm"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:hover:border-neutral-700"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${step.isAiSpotlight ? "text-indigo-500" : "text-neutral-400 dark:text-neutral-500"}`}>
                    {step.badge}
                  </span>
                  {activeStep === idx && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                </div>
                <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Active Feature Detail Box */}
          <div className="lg:col-span-7">
            <div
              className={`
                h-full rounded-2xl border p-8 flex flex-col justify-between transition-all duration-300
                ${
                  journeySteps[activeStep].isAiSpotlight
                    ? "border-indigo-500/30 bg-gradient-to-br from-indigo-50/40 via-white to-indigo-500/5 dark:from-indigo-950/20 dark:via-neutral-900 dark:to-neutral-900"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                }
              `}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {journeySteps[activeStep].badge}
                  </span>
                  {journeySteps[activeStep].isAiSpotlight && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      AI Assistant Engine
                    </span>
                  )}
                </div>

                {/* Feature Title & Detail Text */}
                <h3 className="mt-6 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl dark:text-white">
                  {journeySteps[activeStep].title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {journeySteps[activeStep].description}
                </p>

                {/* Tags preview */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {journeySteps[activeStep].tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-neutral-100 dark:bg-neutral-800/80 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* AI Assistant Spotlight Interactive Graphic / Teaser */}
                {journeySteps[activeStep].isAiSpotlight && (
                  <div className="mt-8 rounded-xl border border-indigo-200/60 bg-white/80 p-5 shadow-xs dark:border-indigo-900/50 dark:bg-neutral-950/60">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      getHack AI Analysis Summary
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-neutral-600 dark:text-neutral-300 font-mono">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>Hackathon Fit: High match for Web3 & React developers</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">!</span>
                        <span>Team Skill Gap Identified: Needs 1 Backend (Node.js/Go) engineer</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-indigo-500 font-bold">★</span>
                        <span>Recommended Teammate: 2 compatible candidates available</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-5">
                <button
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-950 disabled:opacity-40 dark:text-neutral-400 dark:hover:text-white"
                >
                  ← Previous Step
                </button>
                <div className="flex gap-1.5">
                  {journeySteps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        activeStep === i ? "w-6 bg-indigo-500" : "w-1.5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={activeStep === journeySteps.length - 1}
                  onClick={() => setActiveStep((prev) => Math.min(journeySteps.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 disabled:opacity-40 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Callout Footer */}
        <div className="mt-16 text-center border-t border-neutral-200 dark:border-neutral-800 pt-10">
          <p className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
            Find the opportunity. Find the people. Build together.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WhyGetHack;
