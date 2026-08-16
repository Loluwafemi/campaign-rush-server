import "./globals.css";

export const metadata = {
  title: "Host Dashboard — Referral Events",
  description: "Live referral event performance for hosts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
