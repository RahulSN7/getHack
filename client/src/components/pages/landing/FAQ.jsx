import { useState } from "react";

const faqData = [
  {
    question: "What is getHack?",
    answer:
      "getHack is a developer platform designed to help you discover hackathons, find compatible teammates based on skills, analyze project requirements, and collaborate seamlessly from idea to submission.",
  },
  {
    question: "Can I find teammates based on skills?",
    answer:
      "Yes! getHack features skill-based matching that allows you to search for developers by tech stack, domain expertise, experience level, and specific project requirements to build a balanced team.",
  },
  {
    question: "How does the AI Assistant help?",
    answer:
      "Our AI Assistant analyzes complex hackathon rules, evaluates your team's current skill set, identifies missing roles, recommends potential teammates, and suggests hackathons that fit your team's strengths.",
  },
  {
    question: "Can I use getHack if I don't already have a team?",
    answer:
      "Absolutely. Finding teammates is one of getHack's core features. You can join as an individual builder, list your skills, and connect with existing teams looking for members or form a new team.",
  },
  {
    question: "Can I join hackathons remotely?",
    answer:
      "Yes. getHack aggregates hackathons hosted globally. For detailed venue, platform, and participation requirements, check the official registration page.",
  },
  {
    question: "How does team matching work?",
    answer:
      "Our matching algorithm compares project capability requirements with developer profiles, factoring in complementary skills, availability, technical interests, and experience level.",
  },
  {
    question: "Is getHack only for experienced developers?",
    answer:
      "No! getHack is built for builders of all levels — from first-time hackathon participants to seasoned engineers. You can filter events by difficulty and find mentors or beginner-friendly teams.",
  },
  {
    question: "Can I create my own team?",
    answer:
      "Yes! You can create a team roster, define the project scope, post missing skill roles, invite developers directly, and coordinate your hackathon submission together.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleItem = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="px-6 py-24 border-t border-neutral-200 dark:border-neutral-800">
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
