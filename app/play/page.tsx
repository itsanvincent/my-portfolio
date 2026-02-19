import Link from "next/link";

export default function Play() {
  return (
    <div className="min-h-screen bg-white text-zinc-800 flex flex-col">
      <nav className="flex justify-center pt-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            about
          </Link>
          <Link
            href="/work"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            work
          </Link>
          <Link
            href="/play"
            className="text-sm text-zinc-800 font-medium hover:text-zinc-600 transition-colors"
          >
            play
          </Link>
        </div>
      </nav>
      <main className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500">Play — coming soon</p>
      </main>
    </div>
  );
}
