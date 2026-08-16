import "./globals.css";

export const metadata = {
  title: "Referral App — Turn Sharing Into Something People Can See",
  description:
    "Give every referrer a personal, trackable link, a live leaderboard, and a countdown that makes sharing worth doing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
