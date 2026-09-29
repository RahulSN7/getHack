import { Link } from "react-router-dom";
import useSEO from "../../utils/useSEO";

function RoleSelectionPage() {
  useSEO(
    "Select Role — getHack",
    "Choose your role to continue to getHack.",
    { noIndex: true }
  );

  return (
    <div className="w-full mx-auto rounded-2xl border border-neutral-200/90 bg-white shadow-sm transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="p-8 pb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Welcome to getHack
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Please select your role to continue
        </p>
      </div>

      <div className="flex flex-col lg:flex-row relative">
        {/* Left Column: Participant */}
        <div className="flex-1 p-8 pt-4 flex flex-col items-center text-center">
          <div className="mb-4 inline-block text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            For Participants
          </div>
          <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">
            Discover & Build
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
            Discover hackathons, find teammates, and build something meaningful.
          </p>
          <Link
            to="/login/participant"
            className="mt-auto flex h-11 w-full max-w-[240px] items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            Sign In as Participant
          </Link>
          <div className="mt-4 text-[13px] text-neutral-500 dark:text-neutral-400">
            Don't have an account?{" "}
            <Link
              to="/signup/participant"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-neutral-200 dark:bg-neutral-800 my-8"></div>
        <div className="lg:hidden h-px w-full bg-neutral-200 dark:bg-neutral-800 mx-8 max-w-[calc(100%-4rem)]"></div>

        {/* Right Column: Organizer */}
        <div className="flex-1 p-8 pt-4 lg:pt-4 flex flex-col items-center text-center">
          <div className="mb-4 inline-block text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase">
            For Organizers
          </div>
          <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">
            Host & Manage
          </h2>
          <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400 max-w-[280px]">
            Create and manage hackathons and connect with talented participants.
          </p>
          <Link
            to="/login/organizer"
            className="mt-auto flex h-11 w-full max-w-[240px] items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            Sign In as Organizer
          </Link>
          <div className="mt-4 text-[13px] text-neutral-500 dark:text-neutral-400">
            Don't have an account?{" "}
            <Link
              to="/signup/organizer"
              className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelectionPage;
