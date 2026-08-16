const steps = [
  {
    number: "01",
    title: "Create your event",
    body: "Give it a name, your target group or destination link, an optional cover image, and a duration — an hour, a day, a week. That's the whole setup.",
    forWhom: "Host",
  },
  {
    number: "02",
    title: "Share your event's join link",
    body: "Every event gets one link to hand out — in your group, your bio, your newsletter. Anyone who opens it can register as a referrer in seconds.",
    forWhom: "Host",
  },
  {
    number: "03",
    title: "Participants register and get their own link",
    body: "Name and phone number — that's it. In return, they get a personal referral link, a ready-to-send invite message, and their own live dashboard.",
    forWhom: "Participant",
  },
  {
    number: "04",
    title: "They share. The board updates live.",
    body: "Every real click scores. Every duplicate or bot preview is filtered out automatically. Referrers watch their rank move in real time.",
    forWhom: "Everyone",
  },
  {
    number: "05",
    title: "The countdown ends, the winners are clear",
    body: "No ambiguity, no manual counting — just an accurate leaderboard and a full click history whenever you need to look back.",
    forWhom: "Host",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-forest px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forestLight px-3 py-1 text-xs text-creamMuted">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            How it works
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-cream md:text-4xl">
            From zero to a live leaderboard in minutes.
          </h2>
        </div>

        <div className="mt-14 space-y-10">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-5">
              <div className="flex flex-col items-center">
                <span className="font-mono-num flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-lime/40 text-sm font-semibold text-lime">
                  {step.number}
                </span>
                {index < steps.length - 1 && <span className="mt-2 w-px flex-1 bg-forestBorder" />}
              </div>
              <div className="pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-lime">
                  {step.forWhom}
                </span>
                <h3 className="mt-1 font-semibold text-cream">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-creamMuted">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
