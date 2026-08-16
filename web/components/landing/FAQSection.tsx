"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "Do participants need to install anything?",
    a: "No. Registration happens on a normal web page, and their referral link is just a short URL — it works anywhere a link can be shared: WhatsApp, SMS, social bios, email.",
  },
  {
    q: "How do you stop people from inflating their own score?",
    a: "Repeat clicks from the same device on the same link within a rolling window don't count twice, and link-preview fetches from WhatsApp, Telegram, and similar crawlers are detected and excluded automatically — neither ever reaches the leaderboard.",
  },
  {
    q: "What happens when the event's countdown ends?",
    a: "The event closes automatically once its duration passes. The leaderboard and full click history stay available afterward, so you always have a record of what happened.",
  },
  {
    q: "Can I see who's actually clicking, not just the totals?",
    a: "Yes — the host dashboard includes a searchable, filterable log of every click: which referrer, when, and whether it was counted as valid, a duplicate, or a filtered bot preview.",
  },
  {
    q: "Is there a limit to how many people can join an event?",
    a: "No participant cap. The redirect engine is built to stay fast under concurrent load, so an event scaling from a handful of people to a large group doesn't require anything different from you.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-forestLight px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forest px-3 py-1 text-xs text-creamMuted">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            FAQ
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-cream md:text-4xl">
            Questions worth answering upfront.
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-xl border border-forestBorder bg-forest"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium text-cream">{faq.q}</span>
                  <Plus
                    size={18}
                    className={`shrink-0 text-lime transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-creamMuted">{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
