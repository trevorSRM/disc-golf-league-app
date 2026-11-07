import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Lock } from "lucide-react"
import { getSeasonSummary } from "@/lib/data"
import { SeasonRecap } from "@/components/seasons/season-recap"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ year: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { year } = await params
  return { title: `${year} Season | FCDGL` }
}

export default async function SeasonPage({ params }: Params) {
  const { year } = await params
  const row = await getSeasonSummary(Number(year))
  if (!row) notFound()

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/seasons" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All seasons
      </Link>
      <div className="mb-10 mt-6 text-center">
        <h1 className="text-5xl font-black uppercase tracking-tight sm:text-7xl">
          <span className="finale-gold-text">{row.year}</span> <span className="text-white">Season</span>
        </h1>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/45">
          <Lock className="h-3.5 w-3.5" /> Locked {formatDate(row.locked_at.slice(0, 10), "MMM d, yyyy")}
          {row.data.recap === "finale" && " · Season Finale results"}
        </p>
      </div>
      <SeasonRecap summary={row.data} />
    </div>
  )
}
