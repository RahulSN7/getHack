
// LandingPage — main discovery landing page


import HeroCTA from "../../components/pages/landing/HeroCTA";
import FeaturedHackathons from "../../components/pages/landing/FeaturedHackathons";
import HowItWorks from "../../components/pages/landing/HowItWorks";
import FindTeammates from "../../components/pages/landing/FindTeammates";
import WhyGetHack from "../../components/pages/landing/WhyGetHack";
import FAQ from "../../components/pages/landing/FAQ";
import Footer from "../../components/pages/landing/Footer";
import useSEO from "../../utils/useSEO";

function LandingPage() {
  useSEO(
    "getHack — Find Hackathons, Teammates & Build Together",
    "Discover hackathons, find people with the right skills, build your team, and create something meaningful with getHack."
  );

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Hero Section */}
      <main className="relative px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-12 lg:px-8 lg:pt-16 lg:pb-14">

        {/* Decorative background layer — overflow clipped independently so fixed elements above are unaffected */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Subtle dot grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:28px_28px] opacity-60 dark:bg-[radial-gradient(#262626_1px,transparent_1px)] dark:opacity-40" />
          {/* Faint top glow — dark mode only */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[900px] rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/8" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl lg:max-w-4xl">
            {/* Eyebrow badge */}
            <div className="mb-5 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50 px-3 py-1 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400">
                Discover · Connect · Collaborate
              </span>
            </div>

            {/* Headline */}
            <h1
              className="
                text-[2.6rem]
                sm:text-6xl
                lg:text-[4.5rem]
                font-extrabold
                tracking-tight
                text-neutral-950
                leading-[1.08]
                sm:leading-[1.06]
                dark:text-white
              "
            >
              Find your next{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">hackathon</span>
                {/* Underline accent */}
                <svg
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-0 w-full"
                  viewBox="0 0 300 10"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M2 8 C60 3, 200 3, 298 7"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.45"
                  />
                </svg>
              </span>
              {" "}and your team.
            </h1>

            {/* Description */}
            <p
              className="
                mt-5
                sm:mt-6
                max-w-2xl
                text-base
                sm:text-lg
                lg:text-xl
                leading-relaxed
                sm:leading-8
                text-neutral-500
                dark:text-neutral-400
              "
            >
              Discover hackathons, find people with the right skills,
              build your team, and create something meaningful.
            </p>

            {/* CTA Group */}
            <HeroCTA />
          </div>
        </div>
      </main>

      {/* Landing sections */}
      <FeaturedHackathons />
      <HowItWorks />
      <FindTeammates />
      <WhyGetHack />
      <FAQ />
      <Footer />
    </div>
  );
}

export default LandingPage;
