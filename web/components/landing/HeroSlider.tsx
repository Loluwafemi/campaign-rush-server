"use client";

import { useEffect, useState } from "react";
import { Circle } from "lucide-react";

const SLIDE_INTERVAL_MS = 4200;

function BrowserFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-forestBorder bg-forestLight shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-forestBorder/70 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-lime/70" />
        <span className="ml-3 truncate rounded-md bg-forest px-3 py-1 text-xs text-creamMuted">
          {label}
        </span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function LeaderboardMock() {
  const rows = [
    { name: "Jack S.", score: 41, width: "95%" },
    { name: "Micheal K.", score: 33, width: "76%" },
    { name: "Mary R.", score: 28, width: "64%" },
    { name: "Ife O.", score: 19, width: "44%" },
  ];
  return (
    <BrowserFrame label="campaignrush/host/dashboard">
      <p className="mb-4 text-xs uppercase tracking-wide text-creamMuted">Live Leaderboard</p>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.name} className="flex items-center gap-3">
            <span className="w-4 text-xs text-creamMuted">{i + 1}</span>
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-cream">{row.name}</span>
                <span className="font-mono-num text-lime">{row.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-forest">
                <div className="h-full rounded-full bg-lime" style={{ width: row.width }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

function AnalyticsMock() {
  const bars = [30, 55, 40, 70, 50, 85, 60];
  return (
    <BrowserFrame label="campaignrush/host/dashboard">
      <p className="mb-4 text-xs uppercase tracking-wide text-creamMuted">Click Activity</p>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "Valid clicks", value: "482" },
          { label: "Duplicates blocked", value: "63" },
          { label: "Bot previews filtered", value: "27" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-forest px-3 py-2">
            <p className="font-mono-num text-lg font-semibold text-cream">{stat.value}</p>
            <p className="text-[10px] leading-tight text-creamMuted">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="flex h-20 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-lime/80" style={{ height: `${h}%` }} />
        ))}
      </div>
    </BrowserFrame>
  );
}

function ParticipantMock() {
  return (
    <BrowserFrame label="campaignrush/p/abel01">
      <p className="mb-4 text-xs uppercase tracking-wide text-creamMuted">Your Referral Dashboard</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-forest px-3 py-3 text-center">
          <p className="text-[10px] text-creamMuted">Your score</p>
          <p className="font-mono-num text-2xl font-bold text-lime">41</p>
        </div>
        <div className="rounded-lg bg-forest px-3 py-3 text-center">
          <p className="text-[10px] text-creamMuted">Your rank</p>
          <p className="font-mono-num text-2xl font-bold text-cream">#1</p>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-forest px-3 py-3 text-center">
        <p className="text-[10px] text-creamMuted">Time remaining</p>
        <p className="font-mono-num text-lg font-semibold text-cream">1d 06:42:18</p>
      </div>
      <button className="mt-3 w-full rounded-md bg-lime py-2 text-xs font-semibold text-forest">
        Copy Link &amp; Write-up
      </button>
    </BrowserFrame>
  );
}

const slides = [LeaderboardMock, AnalyticsMock, ParticipantMock];

export function HeroSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setActive((i) => (i + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const ActiveSlide = slides[active]!;

  return (
    <div>
      <div key={active} className="animate-[fadeSlide_0.5s_ease-out]">
        <ActiveSlide />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`Show slide ${i + 1}`}
            className="p-1"
          >
            <Circle
              size={8}
              className={i === active ? "fill-lime text-lime" : "fill-forestBorder text-forestBorder"}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
