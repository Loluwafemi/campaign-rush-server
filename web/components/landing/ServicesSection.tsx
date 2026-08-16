import { Link2, BarChart3, ShieldCheck, LayoutDashboard, Smartphone, Timer } from "lucide-react";

const services = [
  {
    icon: Link2,
    title: "Personal referral links",
    body: "Every participant gets a unique, short, shareable link the moment they register — ready to send in one tap.",
  },
  {
    icon: BarChart3,
    title: "Real-time leaderboard",
    body: "Scores update the instant a genuine click lands, visible to hosts and referrers alike, no refresh required.",
  },
  {
    icon: ShieldCheck,
    title: "Bot & duplicate filtering",
    body: "Link-preview crawlers and repeat clicks from the same device never inflate a score — every number on the board is real.",
  },
  {
    icon: LayoutDashboard,
    title: "Host analytics dashboard",
    body: "Total referrals, participant count, and a fraud/duplicate-blocked rate at a glance, plus a searchable click log.",
  },
  {
    icon: Smartphone,
    title: "Participant mini-dashboard",
    body: "Every referrer gets their own mobile-first view of their score, rank, and a one-tap copy of their link and write-up.",
  },
  {
    icon: Timer,
    title: "Time-boxed events",
    body: "Set a duration in hours or days. A live countdown keeps urgency visible until the moment the event closes.",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="bg-forestLight px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forest px-3 py-1 text-xs text-creamMuted">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              What you get
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-cream md:text-4xl">
              Everything a referral event needs. Nothing it doesn&apos;t.
            </h2>
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-forestBorder bg-forest p-6 transition hover:border-lime/40"
            >
              <div className="inline-flex rounded-lg bg-forestLight p-3">
                <s.icon size={20} className="text-lime" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 font-semibold text-cream">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-creamMuted">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
