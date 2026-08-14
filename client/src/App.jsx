import Header from "./components/Header";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <Header />

     <main className="relative overflow-hidden px-6 pt-16 pb-24">
  {/* Subtle background shapes */}
  <div
    className="
      pointer-events-none
      absolute
      left-[10%]
      top-20
      h-64
      w-64
      rounded-full
      bg-indigo-200/40
      blur-3xl

      dark:bg-indigo-900/20
    "
  />

  <div
    className="
      pointer-events-none
      absolute
      right-[10%]
      top-40
      h-72
      w-72
      rounded-full
      bg-blue-200/30
      blur-3xl

      dark:bg-blue-900/20
    "
  />

  <div className="relative mx-auto max-w-7xl">
    <p className="mb-4 text-sm font-semibold tracking-widest text-indigo-500">
      DISCOVER • CONNECT • BUILD
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
  </div>
</main>
    </div>
  );
}

export default App;