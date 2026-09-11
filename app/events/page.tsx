import { getSubmittedEvents } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronRight, Users2, CheckCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

export default async function EventsPage() {
  const events = await getSubmittedEvents()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Event Results</h1>
          <p className="text-muted-foreground">
            {events.length} events completed
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              No completed events yet. Results will appear here after the first event is submitted!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xl sm:text-2xl font-bold text-primary">
                          Event {event.week_number}
                        </span>
                        {event.is_doubles && (
                          <Badge variant="default" className="bg-primary text-xs">
                            <Users2 className="h-3 w-3 mr-1" />
                            Doubles
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(event.date), "MMM d, yyyy")}
                        </Badge>
                        <Badge variant="default" className="bg-accent text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      </div>
                      {event.course_name && (
                        <p className="text-sm text-muted-foreground mt-2 truncate">
                          {event.course_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
