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
      <main className="px-6 pt-20 pb-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-indigo-500">
            DISCOVER · CONNECT · COLLABORATE
          </p>

          <h1
            className="
              text-5xl
              font-bold
              tracking-[-2px]
              text-neutral-950
              sm:text-7xl
              dark:text-white
            "
          >
            Find your next
            <br />
            hackathon.
          </h1>

          <p
            className="
              mt-6
              max-w-xl
              text-lg
              leading-8
              text-neutral-500
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
