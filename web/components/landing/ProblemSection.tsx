import { MessageSquareOff, EyeOff, TrendingDown } from "lucide-react";

const scenarios = [
  {
    icon: MessageSquareOff,
    title: "The link gets posted once.",
    body: "You drop the invite in the group chat. It gets a few reactions, then it's buried under the next fifty messages by lunchtime. Nobody scrolls back for it.",
  },
  {
    icon: EyeOff,
    title: "You have no idea who actually shared it.",
    body: "A few people said they'd tell their friends. Did they? Did it work? Without a way to see it, there's no way to say thank you — or to know your growth channel even exists.",
  },
  {
    icon: TrendingDown,
    title: "Momentum fades before it starts.",
    body: "No visible progress means no urgency. Without something to watch move — a number climbing, a clock counting down — sharing quietly stops feeling worth the effort.",
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="bg-forestLight px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forest px-3 py-1 text-xs text-creamMuted">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          The problem
        </span>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold text-cream md:text-4xl">
          Low traffic usually isn&apos;t a marketing problem. It&apos;s a visibility problem.
        </h2>
        <p className="mt-4 max-w-2xl text-creamMuted">
          Most communities and launches don&apos;t fail from a lack of people willing to help spread
          the word. They fail because sharing happens in the dark — no record, no feedback, no reason
          to keep going.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {scenarios.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-forestBorder bg-forest p-6 transition hover:border-lime/40"
            >
              <s.icon className="text-lime" size={28} strokeWidth={1.5} />
              <h3 className="mt-4 font-semibold text-cream">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-creamMuted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
