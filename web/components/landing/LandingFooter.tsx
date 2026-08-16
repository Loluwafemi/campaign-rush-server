import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-forestBorder bg-forestLight px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
        <span className="font-display font-semibold text-cream">
          Campaign<span className="text-lime">Rush</span>
        </span>

        <nav className="flex flex-wrap items-center justify-center gap-6 text-creamMuted">
          <a href="#problem" className="transition hover:text-cream">
            Why it matters
          </a>
          <a href="#services" className="transition hover:text-cream">
            Services
          </a>
          <a href="#how-it-works" className="transition hover:text-cream">
            How it works
          </a>
          <a href="#faq" className="transition hover:text-cream">
            FAQ
          </a>
          <Link href="/login" className="transition hover:text-cream">
            Sign in
          </Link>
        </nav>

        <p className="text-xs text-creamMuted/70">© {new Date().getFullYear()} Campaign Rush</p>
      </div>
    </footer>
  );
}
