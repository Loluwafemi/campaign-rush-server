import { Sparkles, Link2, ShieldCheck, Timer, BarChart3 } from "lucide-react";

const pairs = [
  {
    icon: Link2,
    problem: "\u201CDid anyone even see my link?\u201D",
    solution:
      "Every referrer gets their own personal, trackable link — not one shared link nobody can attribute. You can finally see whose sharing is actually working.",
  },
  {
    icon: BarChart3,
    problem: "\u201CI have no idea if people are engaging.\u201D",
    solution:
      "A live leaderboard updates the moment a real click lands — visible to you and to every referrer, so momentum is something people can actually watch happen.",
  },
  {
    icon: ShieldCheck,
    problem: "\u201CAre these numbers even real?\u201D",
    solution:
      "Duplicate clicks from the same device and link-preview crawlers (WhatsApp, Telegram) are automatically filtered out — the board only ever reflects genuine reach.",
  },
  {
    icon: Timer,
    problem: "\u201CThere's no reason to share today instead of never.\u201D",
    solution:
      "Every event runs on a visible countdown. A deadline turns \u201Ceventually\u201D into \u201Cright now\u201D — for every single referrer, at the same time.",
  },
];

export function SolutionSection() {
  return (
    <section id="solution" className="bg-forest px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forestLight px-3 py-1 text-xs text-creamMuted">
          <Sparkles size={12} className="text-lime" />
          The fix
        </span>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold text-cream md:text-4xl">
          Visibility is the whole product.
        </h2>
        <p className="mt-4 max-w-2xl text-creamMuted">
          Referral App doesn&apos;t try to make people share more. It makes sharing something everyone
          can actually see working — which is what makes them keep doing it.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {pairs.map((p) => (
            <div key={p.problem} className="rounded-2xl border border-forestBorder bg-forestLight p-6">
              <p className="text-sm italic text-creamMuted/80">{p.problem}</p>
              <div className="mt-4 flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-forest p-2">
                  <p.icon size={18} className="text-lime" />
                </div>
                <p className="text-sm leading-relaxed text-cream">{p.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
