import { useState } from "react";

const faqData = [
  {
    question: "What is getHack?",
    answer:
      "getHack brings hackathons, people, teams, and collaboration together in one place, helping you go from discovering an opportunity to finding the right teammates with AI assistance.",
  },
  {
    question: "Can I find teammates based on skills?",
    answer:
      "Yes. You can discover developers and designers based on their skills, experience, availability, and profile information. This helps you find people whose skills complement your own and build stronger hackathon teams.",
  },
  {
    question: "How does the AI Assistant help?",
    answer:
      "AI Assistant, your getHack AI, helps you make better hackathon decisions. It can help discover suitable hackathons and identify potential teammates based on your skills and requirements.",
  },
  {
    question: "Can I use getHack if I don't already have a team?",
    answer:
      "Yes. You can use getHack even if you are starting alone. Discover hackathons, find people with complementary skills, send connection requests, connect with them, and build your team through the platform.",
  },
  {
    question: "How does team matching work?",
    answer:
      "Team matching helps you discover people with skills that complement your own. getHack can use information such as skills, experience, availability, and your requirements to help identify potential teammates.",
  },
  {
    question: "Is getHack only for experienced developers?",
    answer:
      "No. getHack is designed for developers and builders at different experience levels. Whether you are experienced or still developing your skills, you can discover opportunities, connect with other builders, and find teammates who complement your abilities.",
  },
  {
    question: "Can I create my own team?",
    answer:
      "Yes. You can create a team and invite or connect with people you want to collaborate with. getHack also supports team-based collaboration so you can organize your teammates around hackathon projects.",
  },
  {
    question: "How can I organize my hackathon on getHack?",
    answer:
      "If you are organizing a hackathon, sign up for getHack with the Organizer role. Once your organizer account is set up, you can add, publish, and manage your hackathon listings so developers can discover your event on getHack.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleItem = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-24 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-4xl">
        {/* Section Header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl dark:text-white">
            Everything you need to know about getHack
          </h2>
          <p className="mt-3 text-base text-neutral-500 dark:text-neutral-400">
            Got questions? We have answers. Learn how getHack helps you discover events and build winning teams.
          </p>
        </div>

        {/* Accordion list */}
        <div className="mt-12 space-y-3">
          {faqData.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.question}
                className="rounded-xl border border-neutral-200/90 bg-white transition-colors dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-neutral-900 transition-colors dark:text-white"
                >
                  <span className="text-base sm:text-lg">{item.question}</span>
                  <span
                    className={`ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-base font-bold transition-transform duration-200 ${
                      isOpen
                        ? "border-neutral-300 bg-neutral-100 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                        : "border-neutral-200 bg-transparent text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/80 mt-1">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
