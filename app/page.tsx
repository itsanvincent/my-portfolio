import ChromaticRevealImage from "./components/ChromaticRevealImage";
import Link from "next/link";
import ProgressiveRevealBio from "./components/ProgressiveRevealBio";
import TimezonePill from "./components/TimezonePill";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden overflow-y-auto md:overflow-hidden md:h-screen bg-white flex flex-col">
      <nav className="hidden flex justify-center pt-8 pb-8 shrink-0">
        <div className="flex items-center gap-8">
          <span className="text-sm text-zinc-800 font-medium">about</span>
          <Link
            href="/work"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            work
          </Link>
          <Link
            href="/play"
            className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            play
          </Link>
        </div>
      </nav>

      <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto md:overflow-hidden flex flex-col md:flex-row md:items-stretch md:justify-center max-w-5xl mx-auto w-full px-6 pb-6">
        {/* Desktop: hero + pill in left column */}
        <div className="hidden md:flex md:sticky md:top-0 md:h-full md:shrink-0 md:flex-col md:items-center md:justify-center md:pr-12 lg:pr-16 gap-6">
          <div className="hide-custom-cursor relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] shrink-0 rounded-full overflow-hidden cursor-default">
            <ChromaticRevealImage />
          </div>
          <TimezonePill />
        </div>

        {/* Bio sections with progressive reveal; on mobile, first section includes name + globe + pill via mobileHero */}
        <ProgressiveRevealBio
          mobileHero={
            <>
              <div className="hide-custom-cursor relative shrink-0 rounded-full overflow-hidden cursor-default w-[min(70vw,280px)] h-[min(70vw,280px)]">
                <ChromaticRevealImage />
              </div>
              <TimezonePill />
            </>
          }
        />
      </main>
    </div>
  );
}
