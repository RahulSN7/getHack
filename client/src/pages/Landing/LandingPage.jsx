// ---------------------------------------------------------------------------
// LandingPage — main discovery landing page
// ---------------------------------------------------------------------------

import HeroCTA from "../../components/pages/landing/HeroCTA";
import FeaturedHackathons from "../../components/pages/landing/FeaturedHackathons";
import HowItWorks from "../../components/pages/landing/HowItWorks";
import FindTeammates from "../../components/pages/landing/FindTeammates";
import WhyGetHack from "../../components/pages/landing/WhyGetHack";
import FAQ from "../../components/pages/landing/FAQ";
import Footer from "../../components/pages/landing/Footer";

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Hero Section — Refined Typography-First Layout */}
      <main className="px-4 pt-12 pb-8 sm:px-6 sm:pt-16 sm:pb-10 lg:px-8 lg:pt-16 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl lg:max-w-4xl">
            {/* Eyebrow */}
            <p className="mb-2.5 sm:mb-3.5 text-xs sm:text-sm font-semibold tracking-widest text-indigo-500 uppercase">
              DISCOVER · CONNECT · COLLABORATE
            </p>

            {/* Headline */}
            <h1
              className="
                text-4xl
                sm:text-6xl
                lg:text-7xl
                font-extrabold
                tracking-tight
                text-neutral-950
                leading-[1.1]
                sm:leading-[1.05]
                dark:text-white
              "
            >
              Find your next{" "}
              <span className="block">hackathon.</span>
            </h1>

            {/* Description */}
            <p
              className="
                mt-4
                sm:mt-5
                max-w-2xl
                text-base
                sm:text-lg
                lg:text-xl
                leading-relaxed
                sm:leading-8
                text-neutral-600
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
