import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-red-600 focus:p-3">Skip to content</a>
      <header className="border-b border-white/10 bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/f1" className="flex items-center gap-3" aria-label="F1 Dashboard home">
            <span className="rounded-md bg-red-600 px-3 py-1.5 text-xl font-black italic tracking-tighter">F1</span>
            <span className="text-sm font-semibold tracking-wide">SESSION EXPLORER</span>
          </Link>
          <nav aria-label="Main navigation"><Link href="/f1" className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">Seasons & sessions</Link></nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 border-t border-white/10 px-4 py-6 text-xs text-zinc-500 sm:px-6 lg:px-8">
        <span>F1 Dashboard · Session analysis</span><span>Timing data via FastF1 · Unofficial project</span>
      </footer>
    </div>
  );
}
