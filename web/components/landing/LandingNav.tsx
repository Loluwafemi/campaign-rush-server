import Link from "next/link";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-forestBorder/60 bg-forest/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-display text-lg font-semibold tracking-tight text-cream">
          Campaign<span className="text-lime">Rush</span>
        </span>

        <nav className="hidden items-center gap-8 text-sm text-creamMuted md:flex">
          <a href="#problem" className="transition hover:text-cream">
            Why it matters
          </a>
          <a href="#solution" className="transition hover:text-cream">
            How it helps
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
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-creamMuted transition hover:text-cream sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-lime px-5 py-2 text-sm font-semibold text-forest transition hover:bg-limeDark"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
