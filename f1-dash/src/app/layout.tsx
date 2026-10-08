import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "F1 Dashboard", template: "%s | F1 Dashboard" },
  description: "Explore Formula 1 sessions, classifications, lap times and circuits.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
