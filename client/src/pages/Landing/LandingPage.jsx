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
    <div className="min-h-screen bg-slate-50 text-neutral-900 transition-colors dark:bg-neutral-950 dark:text-neutral-100">
      {/* Hero */}
      <main className="px-4 pt-6 pb-8 sm:px-6 sm:pt-12 sm:pb-12 lg:px-8 lg:pt-16 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-2 sm:mb-4 text-xs sm:text-sm font-semibold tracking-widest text-indigo-500 uppercase">
            DISCOVER · CONNECT · COLLABORATE
          </p>

          <h1
            className="
              text-3xl
              sm:text-6xl
              lg:text-7xl
              font-extrabold
              tracking-tight
              text-neutral-950
              leading-[1.15]
              sm:leading-[1.1]
              dark:text-white
            "
          >
            Find your{" "}
            <span className="block sm:inline">next hackathon.</span>
          </h1>

          <p
            className="
              mt-3
              sm:mt-6
              max-w-xl
              text-sm
              sm:text-lg
              leading-relaxed
              sm:leading-8
              text-neutral-600
              dark:text-neutral-400
            "
          >
            Discover hackathons, find people with the right
            skills, build your team, and create something
            meaningful.
          </p>

          <HeroCTA />
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
