import { useState } from "react";

const stages = [
  {
    id: "01",
    phase: "Discover",
    title: "Find hackathons worth building for.",
    subtitle: "Filter opportunities by skills, technology, interests, deadline, location, and domain.",
    description:
      "Stop browsing endless lists. getHack surfaces curated hackathons matching your exact stack and interests, whether you're looking for AI sprints, Web3 challenges, or social impact hackathons.",
    badge: "01 · DISCOVER",
  },
  {
    id: "02",
    phase: "Match",
    title: "Find people who complete your team.",
    subtitle: "Identify complementary skills, not just random user profiles.",
    description:
      "Great teams are built on complementary strengths. getHack helps you see what capabilities your team already has and connects you directly with builders who bring the missing pieces.",
    badge: "02 · MATCH",
  },
  {
    id: "03",
    phase: "Analyze",
    isAiSpotlight: true,
    title: "Understand what your team is missing.",
    subtitle: "Intelligent AI analysis of hackathon rules and team skill gaps.",
    description:
      "Our AI Assistant evaluates team composition against hackathon requirements, pinpoints missing skill roles, and recommends ideal candidate matches automatically.",
    badge: "03 · ANALYZE (AI INTELLIGENCE)",
  },
  {
    id: "04",
    phase: "Build",
    title: "Turn the right people into a team.",
    subtitle: "Lock in roles, confirm rosters, and prepare for execution.",
    description:
      "Transition from individual developers into a structured team. Define project goals, assign responsibilities, and confirm your roster before the hackathon clock starts.",
    badge: "04 · BUILD",
  },
  {
    id: "05",
    phase: "Collaborate",
    title: "Build, communicate, and ship together.",
    subtitle: "Centralized communication and sprint coordination.",
    description:
      "Keep all hackathon discussion, resource sharing, and task progress in one place with dedicated team chat and real-time coordination tools.",
    badge: "05 · COLLABORATE",
  },
];

function WhyGetHack() {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentStage = stages[activeIdx];

  return (
    <section id="why-gethack" className="px-6 py-24 bg-slate-50/50 dark:bg-neutral-950/60 transition-colors">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            WHY GETHACK
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl dark:text-white">
            More than a hackathon directory.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Find the right opportunity, connect with the right people, and build something meaningful together.
          </p>
        </div>

        {/* Journey Progress Track */}
        <div className="mt-12 overflow-x-auto pb-4 pt-2 no-scrollbar">
          <div className="flex items-center gap-2 min-w-max border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
            {stages.map((stage, idx) => {
              const isActive = activeIdx === idx;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                        : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                    }
                  `}
                >
                  <span className="text-xs font-bold opacity-60">{stage.id}</span>
                  <span>{stage.phase}</span>
                  {idx < stages.length - 1 && (
                    <span className="ml-2 text-neutral-300 dark:text-neutral-700">→</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Asymmetrical Editorial Product Layout */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Column (5 Cols): Stage Selector Timeline List */}
          <div className="space-y-3.5 lg:col-span-5">
            {stages.map((stage, idx) => {
              const isActive = activeIdx === idx;
              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`
                    group cursor-pointer rounded-xl border p-5 transition-all duration-200
                    ${
                      isActive
                        ? stage.isAiSpotlight
                          ? "border-indigo-500/60 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-xs"
                          : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 shadow-xs"
                        : "border-neutral-200/70 bg-white/50 hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/30 dark:hover:border-neutral-700"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        stage.isAiSpotlight ? "text-indigo-500" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {stage.badge}
                    </span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-white">
                    {stage.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                    {stage.subtitle}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column (7 Cols): Product Story UI Display */}
          <div className="lg:col-span-7">
            <div
              className={`
                h-full rounded-2xl border p-7 sm:p-8 flex flex-col justify-between transition-all duration-300
                ${
                  currentStage.isAiSpotlight
                    ? "border-indigo-500/40 bg-gradient-to-b from-indigo-500/5 via-white to-white dark:from-indigo-950/20 dark:via-neutral-900 dark:to-neutral-900"
                    : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                }
              `}
            >
              <div>
                {/* Stage Header Badge */}
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    STAGE {currentStage.id}
                  </span>
                  {currentStage.isAiSpotlight && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      AI Assistant Engine
                    </span>
                  )}
                </div>

                {/* Stage Title & Copy */}
                <h3 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl dark:text-white">
                  {currentStage.title}
                </h3>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {currentStage.description}
                </p>

                {/* DYNAMIC PRODUCT INTERACTION MOCKUP PER STAGE */}
                <div className="mt-7">
                  {/* STAGE 01: DISCOVER MOCKUP */}
                  {activeIdx === 0 && (
                    <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
                        <span>Active Filter Signals</span>
                        <span className="text-indigo-500">42 Hackathons Found</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Tech: React & Node.js ✕
                        </span>
                        <span className="rounded-md bg-neutral-200/70 dark:bg-neutral-800 px-2.5 py-1 font-medium text-neutral-700 dark:text-neutral-300">
                          Format: Online
                        </span>
                        <span className="rounded-md bg-neutral-200/70 dark:bg-neutral-800 px-2.5 py-1 font-medium text-neutral-700 dark:text-neutral-300">
                          Deadline: &lt; 14 Days
                        </span>
                        <span className="rounded-md bg-neutral-200/70 dark:bg-neutral-800 px-2.5 py-1 font-medium text-neutral-700 dark:text-neutral-300">
                          Domain: AI & Web3
                        </span>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900">
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">BuildWithAI 2025</p>
                            <p className="text-neutral-500 dark:text-neutral-400">Google Developer Groups · Online</p>
                          </div>
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                            $2,500 Prize
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 02: MATCH MOCKUP (COMPLEMENTARY SKILLS) */}
                  {activeIdx === 1 && (
                    <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-white mb-3">
                        Complementary Skill Matrix
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 text-xs">
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">Current Team Skills</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded bg-white px-2 py-0.5 font-medium text-neutral-800 shadow-xs dark:bg-neutral-800 dark:text-neutral-200">React ✓</span>
                            <span className="rounded bg-white px-2 py-0.5 font-medium text-neutral-800 shadow-xs dark:bg-neutral-800 dark:text-neutral-200">Node.js ✓</span>
                            <span className="rounded bg-white px-2 py-0.5 font-medium text-neutral-800 shadow-xs dark:bg-neutral-800 dark:text-neutral-200">UI/UX ✓</span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 dark:bg-amber-500/10">
                          <p className="font-bold text-amber-700 dark:text-amber-400">Needed Complementary Skills</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">AI/ML Engineer</span>
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">Backend Architect</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs dark:bg-indigo-500/10">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-500 text-white font-bold grid place-items-center text-[10px]">AP</div>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">Arjun Patel (PyTorch / FastAPI)</p>
                            <p className="text-neutral-500 dark:text-neutral-400">Matches 100% of needed AI/ML role</p>
                          </div>
                        </div>
                        <span className="rounded bg-indigo-500 text-white px-2.5 py-1 font-bold text-[11px]">Connect</span>
                      </div>
                    </div>
                  )}

                  {/* STAGE 03: ANALYZE MOCKUP (EXACT AI TEAM SKILL ANALYSIS REQUIREMENT) */}
                  {activeIdx === 2 && (
                    <div className="rounded-xl border border-indigo-500/40 bg-white p-5 shadow-xs dark:border-indigo-900/60 dark:bg-neutral-950/80">
                      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          Team Skill Analysis
                        </div>
                        <span className="text-[10px] font-mono text-indigo-500">getHack Intelligence Engine</span>
                      </div>

                      {/* User Requested UI Format */}
                      <div className="mt-4 space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between rounded bg-neutral-50 px-3 py-1.5 dark:bg-neutral-900">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Frontend</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Covered</span>
                        </div>
                        <div className="flex items-center justify-between rounded bg-neutral-50 px-3 py-1.5 dark:bg-neutral-900">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">Backend</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Covered</span>
                        </div>
                        <div className="flex items-center justify-between rounded bg-neutral-50 px-3 py-1.5 dark:bg-neutral-900">
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">UI/UX</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Covered</span>
                        </div>
                        <div className="flex items-center justify-between rounded bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 dark:bg-amber-500/10">
                          <span className="font-bold text-amber-800 dark:text-amber-300">Missing</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">AI/ML</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40">
                        <span className="text-neutral-700 dark:text-neutral-300">Suggested teammates:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">3 potential matches</span>
                      </div>
                    </div>
                  )}

                  {/* STAGE 04: BUILD MOCKUP */}
                  {activeIdx === 3 && (
                    <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white mb-3">
                        <span>Official Team Roster</span>
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Roster Locked (4/4)</span>
                      </div>

                      <div className="grid gap-2 text-xs">
                        {[
                          { name: "Priya Sharma", role: "Team Lead & Full Stack", status: "Confirmed" },
                          { name: "Arjun Patel", role: "AI/ML Engineer", status: "Confirmed" },
                          { name: "Sneha Reddy", role: "Backend Architect", status: "Confirmed" },
                          { name: "Karthik Nair", role: "UI/UX Designer", status: "Confirmed" },
                        ].map((member) => (
                          <div key={member.name} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                            <div>
                              <p className="font-semibold text-neutral-900 dark:text-white">{member.name}</p>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{member.role}</p>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓ {member.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STAGE 05: COLLABORATE MOCKUP */}
                  {activeIdx === 4 && (
                    <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/60">
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white mb-3">
                        <span>Sprint Coordination & Chat</span>
                        <span className="text-indigo-500 font-mono text-[11px]">#team-workspace</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                          <p className="font-bold text-neutral-900 dark:text-white">Priya <span className="text-[10px] font-normal text-neutral-400">10:14 AM</span></p>
                          <p className="mt-0.5 text-neutral-600 dark:text-neutral-300">Pushed initial UI components to GitHub repo. API endpoints ready for testing.</p>
                        </div>
                        <div className="rounded-lg border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900">
                          <p className="font-bold text-neutral-900 dark:text-white">Arjun <span className="text-[10px] font-normal text-neutral-400">10:16 AM</span></p>
                          <p className="mt-0.5 text-neutral-600 dark:text-neutral-300">Model inference API deployed on FastAPI server. Testing response times now.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stage Stepper Footer Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-5">
                <button
                  type="button"
                  disabled={activeIdx === 0}
                  onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-950 disabled:opacity-40 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  ← Previous
                </button>
                <div className="flex gap-1.5">
                  {stages.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        activeIdx === i ? "w-6 bg-indigo-500" : "w-1.5 bg-neutral-300 dark:bg-neutral-700"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={activeIdx === stages.length - 1}
                  onClick={() => setActiveIdx((prev) => Math.min(stages.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-600 disabled:opacity-40 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Core Journey Statement */}
        <div className="mt-16 border-t border-neutral-200/80 dark:border-neutral-800 pt-10 text-center">
          <p className="text-sm font-semibold tracking-wide text-neutral-600 dark:text-neutral-400">
            Discover opportunities. Connect the people. Understand what&apos;s missing. Build the team. Collaborate.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WhyGetHack;
