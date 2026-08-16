import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-accent">Referral App</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight text-textPrimary">
        Turn every invite into a competition.
      </h1>
      <p className="mt-4 text-lg text-textMuted">
        Launch a referral event in minutes. Watch the leaderboard fill in real time.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-canvas transition hover:opacity-90"
        >
          Create your event
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-textPrimary transition hover:border-accent"
        >
          Sign in
        </Link>
      </div>

      <section className="mt-16 space-y-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">How it works</h2>
          <ol className="mt-3 space-y-3 text-textMuted">
            <li>
              <span className="font-medium text-textPrimary">1. Create your event.</span> Give it a
              name, a target group link, a duration, and an optional cover image for link previews.
            </li>
            <li>
              <span className="font-medium text-textPrimary">2. Your people register.</span> Anyone
              joining gets their own short, shareable link and a ready-to-send invite message.
            </li>
            <li>
              <span className="font-medium text-textPrimary">3. They share. You watch the board move.</span>{" "}
              Duplicate clicks and bot link-previews are filtered out automatically.
            </li>
            <li>
              <span className="font-medium text-textPrimary">4. The event closes, the winners are clear.</span>{" "}
              A live countdown keeps urgency high until the very end.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
            Built for the moment it actually goes viral
          </h2>
          <ul className="mt-3 space-y-2 text-textMuted">
            <li>• Instant redirects — no loading spinner between a tap and landing in your group.</li>
            <li>• Fair scoring — the same person can&apos;t inflate their own rank by re-clicking.</li>
            <li>• Clean previews everywhere — links unfurl properly in WhatsApp and Telegram.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
