import Link from "next/link"
import { CalendarDays, Crown } from "lucide-react"
import { getSeasonSummaries, getWeeks } from "@/lib/data"
import { DiscIcon } from "@/components/finale/finale-sections"
import { SeasonRecap } from "@/components/seasons/season-recap"
import { Dashboard } from "@/components/home/dashboard"

export const dynamic = "force-dynamic"

// Off-season (latest season locked, nothing scheduled for the next one yet):
// show that season's recap. Once a newer event exists, back to the dashboard.
export default async function HomePage() {
  const [seasons, weeks] = await Promise.all([getSeasonSummaries(), getWeeks()])
  const latest = seasons[0]
  const nextSeasonStarted = !!latest && weeks.some(w => Number(w.date.slice(0, 4)) > latest.year)
  if (!latest || nextSeasonStarted) return <Dashboard />

  const nextYear = latest.year + 1
  return (
    <div className="relative overflow-hidden">
      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.3_0.08_250),transparent_65%)]" />
        <div className="absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute -right-32 top-40 -z-10 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="finale-grid-bg absolute inset-0 -z-10" />
        <div className="container mx-auto px-4 pb-12 pt-12 text-center sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-gold">
            <Crown className="h-3.5 w-3.5" /> FCDGL {latest.year} · Season complete
          </div>
          <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl md:text-8xl">
            <span className="finale-gold-text">Season Finale</span>
            <br />
            <span className="text-white">Results</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
            Thanks for an incredible season. See you in {nextYear}!
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-14">
        <SeasonRecap summary={latest.data} />
      </div>

      <section className="border-t border-white/10 bg-black/20">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-14 text-center">
          <DiscIcon className="h-12 w-12" />
          <div className="text-3xl font-black uppercase tracking-tight sm:text-4xl">
            See you in <span className="finale-gold-text">{nextYear}</span>
          </div>
          <Link href="/seasons" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            <CalendarDays className="h-4 w-4" /> All seasons
          </Link>
        </div>
      </section>
    </div>
  )
}
