import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTABand() {
  return (
    <section className="bg-forest px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border border-forestBorder bg-forestLight px-8 py-14 text-center">
        <h2 className="font-display text-3xl font-bold text-cream md:text-4xl">
          Stop wondering if anyone saw the link.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-creamMuted">
          Set a duration, share one link, and watch real reach show up on a board everyone can see.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime px-7 py-3.5 text-sm font-semibold text-forest transition hover:bg-limeDark"
        >
          Create your first event <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
