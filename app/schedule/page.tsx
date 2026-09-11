import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users2, Trophy, MapPin, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { getSchedule, getNextUpcomingIndex } from "@/lib/schedule"

export const dynamic = "force-dynamic"

export default function SchedulePage() {
  const schedule = getSchedule()
  const nextIndex = getNextUpcomingIndex(schedule)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-balance">Schedule</h1>
          <p className="text-muted-foreground">
            Thursdays at 6:00 PM, alternating between Akron and Rochester
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schedule.map((entry, index) => {
          const isNext = index === nextIndex
          const isPast = nextIndex === -1 ? true : index < nextIndex

          return (
            <Card
              key={entry.date.toISOString()}
              className={cn(
                "h-full transition-colors",
                isNext && "border-primary ring-1 ring-primary",
                entry.isTournament && !isPast && "border-accent/60",
                isPast && "opacity-60"
              )}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg sm:text-xl font-bold">
                        {format(entry.date, "EEE, MMM d")}
                      </span>
                      {isNext && (
                        <Badge variant="default" className="bg-primary text-xs">
                          Next Up
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{entry.label}</p>
                  </div>
                  {entry.isTournament ? (
                    <Trophy className="h-5 w-5 text-accent shrink-0" aria-hidden="true" />
                  ) : entry.isDoubles ? (
                    <Users2 className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {entry.location && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                      {entry.location}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                    {entry.time}
                  </Badge>
                  {entry.isDoubles && (
                    <Badge variant="default" className="bg-primary text-xs">
                      <Users2 className="h-3 w-3 mr-1" aria-hidden="true" />
                      Doubles
                    </Badge>
                  )}
                  {entry.isTournament && (
                    <Badge variant="default" className="bg-accent text-xs">
                      <Trophy className="h-3 w-3 mr-1" aria-hidden="true" />
                      Tournament
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
