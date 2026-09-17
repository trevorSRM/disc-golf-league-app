import { getDoublesEvents } from "@/lib/data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, ChevronRight, Users } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DoublesPage() {
  const events = await getDoublesEvents()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Doubles Events</h1>
          <p className="text-muted-foreground">
            {events.length} events
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              No doubles events yet. Random draw doubles results will appear here!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/doubles/${event.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <Badge variant="outline">
                          {formatDate(event.event_date, "MMMM d, yyyy")}
                        </Badge>
                      </div>
                      {event.course_name && (
                        <p className="text-sm text-muted-foreground">
                          {event.course_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
