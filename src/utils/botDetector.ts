export interface BotDetectionResult {
  isBot: boolean;
  crawlerName: string | null;
}

/**
 * Crawler signatures explicitly called out for Phase 3: these fetch a
 * link once to build a rich preview (WhatsApp/Telegram unfurling a
 * chat invite, Twitter/Facebook card previews, Googlebot indexing)
 * and must never be redirected or counted as a referral click.
 * Matching is case-insensitive substring matching against the raw
 * User-Agent header.
 */
const CRAWLER_SIGNATURES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /WhatsApp/i, name: "WhatsApp" },
  { pattern: /Telegram/i, name: "Telegram" },
  { pattern: /Twitterbot/i, name: "Twitterbot" },
  { pattern: /facebookexternalhit/i, name: "facebookexternalhit" },
  { pattern: /Googlebot/i, name: "Googlebot" },
];

/** Inspects a User-Agent header and reports whether it matches a known crawler. */
export function detectBot(userAgent: string | null): BotDetectionResult {
  if (!userAgent) {
    return { isBot: false, crawlerName: null };
  }

  for (const sig of CRAWLER_SIGNATURES) {
    if (sig.pattern.test(userAgent)) {
      return { isBot: true, crawlerName: sig.name };
    }
  }

  return { isBot: false, crawlerName: null };
}
