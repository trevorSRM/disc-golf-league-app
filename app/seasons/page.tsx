import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, Crown, Lock, Trophy, Users2 } from "lucide-react"
import { getSeasonSummaries } from "@/lib/data"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Seasons | FCDGL",
  description: "Every FCDGL season, locked in.",
}

export default async function SeasonsPage() {
  const seasons = await getSeasonSummaries()

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-gold">
          <Trophy className="h-3.5 w-3.5" /> FCDGL
        </div>
        <h1 className="mt-5 text-4xl font-black uppercase tracking-tight sm:text-6xl">
          <span className="finale-gold-text">Seasons</span>
        </h1>
        <p className="mt-3 text-white/60">Every season&apos;s champions and results, locked in for good.</p>
      </div>

      {seasons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
          No seasons locked yet.
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map(({ year, data }) => {
            const champ = (s: typeof data.singles) => s?.standings.filter(r => r.position === 1).map(r => r.name).join(" / ") || "—"
            return (
              <Link
                key={year}
                href={`/seasons/${year}`}
                className="finale-glass group flex items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-gold/40"
              >
                <div className="text-4xl font-black tabular-nums text-gold">{year}</div>
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Crown className="h-4 w-4 shrink-0 text-gold" />
                    <span className="text-white/50">Singles</span>
                    <span className="truncate font-semibold">{champ(data.singles)}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Users2 className="h-4 w-4 shrink-0 text-gold" />
                    <span className="text-white/50">Doubles</span>
                    <span className="truncate font-semibold">{champ(data.doubles)}</span>
                  </div>
                </div>
                <Lock className="hidden h-4 w-4 text-white/30 sm:block" />
                <ChevronRight className="h-5 w-5 text-white/40 group-hover:text-white" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
