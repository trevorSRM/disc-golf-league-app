import Image from "next/image"
import { Users, Calendar, DollarSign } from "lucide-react"

interface DashboardHeroProps {
  memberCount: number
  totalWeeks: number
  acePool: number
}

export function DashboardHero({ memberCount, totalWeeks, acePool }: DashboardHeroProps) {
  return (
    <div className="relative bg-gradient-to-br from-card via-background to-card border-b border-border">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-primary rounded-full" />
        <div className="absolute top-20 right-20 w-24 h-24 border-2 border-primary rounded-full" />
        <div className="absolute bottom-10 left-1/3 w-16 h-16 border-2 border-primary rounded-full" />
      </div>
      
      <div className="container mx-auto px-4 py-6 md:py-8 relative">
        <div className="flex justify-center items-center gap-3 md:gap-8 mb-4">
          <Image
            src="/images/fcdgl-logo.png"
            alt="Fulton County Disc Golf League"
            width={400}
            height={200}
            className="h-24 sm:h-36 md:h-48 w-auto"
            priority
          />
          <div className="h-12 sm:h-16 md:h-20 w-px bg-border" />
          <Image
            src="/images/srm-logo-white.png"
            alt="SRM - Sponsor"
            width={150}
            height={75}
            className="h-12 sm:h-18 md:h-24 w-auto"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
            <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{memberCount}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Members</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{totalWeeks}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Weeks</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-secondary/50 border border-border">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-accent" />
            <div className="text-2xl font-bold">${acePool}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Ace Pool</div>
          </div>
        </div>
      </div>
    </div>
  )
}
