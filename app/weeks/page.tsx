import { getWeeks } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronRight, Users2 } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function WeeksPage() {
  const weeks = await getWeeks()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Weekly Results</h1>
          <p className="text-muted-foreground">
            {weeks.length} weeks played
          </p>
        </div>
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              No weeks recorded yet. Results will appear here after the first week!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => (
            <Link
              key={week.id}
              href={`/weeks/${week.id}`}
              className="group"
            >
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-primary">
                          Week {week.week_number}
                        </span>
                        {week.is_doubles && (
                          <Badge variant="default" className="bg-primary">
                            <Users2 className="h-3 w-3 mr-1" />
                            Doubles
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline">
                        {formatDate(week.date, "MMMM d, yyyy")}
                      </Badge>
                      {week.course_name && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {week.course_name}
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
