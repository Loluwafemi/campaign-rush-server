import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroSlider } from "@/components/landing/HeroSlider";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-forest px-6 pb-20 pt-16 md:pt-24">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-lime/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-lime/5 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-forestBorder bg-forestLight px-3 py-1 text-xs text-creamMuted">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            Built for referral-driven growth
          </span>

          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] text-cream md:text-5xl">
            Nobody joins what they never see.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-creamMuted">
            Every community, group, or launch dies quietly the same way — not from a bad product,
            but from a link nobody clicked. Referral App turns your own people into a visible,
            trackable growth engine.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-forest transition hover:bg-limeDark"
            >
              Create your event <ArrowRight size={16} />
            </Link>
            <a
              href="#how-it-works"
              className="rounded-full border border-forestBorder px-6 py-3 text-sm font-medium text-cream transition hover:border-lime"
            >
              See how it works
            </a>
          </div>
        </div>

        <HeroSlider />
      </div>
    </section>
  );
}
