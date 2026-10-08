import Link from "next/link";
export default function NotFound() {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center"><p className="text-sm font-semibold uppercase tracking-widest text-red-400">404 / Off track</p><h1 className="text-3xl font-bold">This page does not exist.</h1><p className="text-zinc-400">Return to the session explorer to choose a season.</p><Link className="rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500" href="/f1">Explore sessions</Link></main>;
}
