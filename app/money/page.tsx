import { getCalculatedFinances, getAces, getPlayerMoneyRankings } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Disc, TrendingUp, TrendingDown, Sparkles, Trophy, Users, Calendar, Flame, Target, Medal } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { COUNT_MEMBERSHIP_FEES, MONEY_RESTART } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function MoneyPage() {
  const [finances, aces, moneyRankings] = await Promise.all([
    getCalculatedFinances(),
    getAces(),
    getPlayerMoneyRankings()
  ])

  const netBalance = finances.total_collected - finances.total_paid_out

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">League Money</h1>
          <p className="text-muted-foreground">
            Auto-calculated from memberships, attendance, and payouts
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ace Pool - Hero Card */}
        <Card className="lg:col-span-3 border-money/50 bg-gradient-to-br from-money/10 to-transparent overflow-hidden relative">
          <div className="absolute top-4 right-4">
            <Sparkles className="h-8 w-8 text-money/30" />
          </div>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Disc className="h-8 w-8 text-money" />
                <span className="text-xl font-medium text-money">Ace Pool</span>
              </div>
              <div className="text-7xl font-bold text-money mb-2 animate-pulse-glow inline-block px-8 py-4 rounded-full bg-money/10 border-2 border-money/30">
                ${finances.ace_pool.toFixed(0)}
              </div>
              <p className="text-muted-foreground mt-4">
                Growing $40 every week until someone hits an ace!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Finance Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-success">
              ${finances.total_collected.toFixed(0)}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {MONEY_RESTART && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Cash count after Week {MONEY_RESTART.afterWeek}
                  </span>
                  <span className="font-medium">${finances.breakdown.starting_cash}</span>
                </div>
              )}
              {COUNT_MEMBERSHIP_FEES && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <Users className="h-4 w-4 inline mr-1" />
                    {finances.breakdown.member_count} members × $25
                  </span>
                  <span className="font-medium">${finances.breakdown.membership_fees}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {finances.breakdown.total_attendance} rounds × $5
                </span>
                <span className="font-medium">${finances.breakdown.weekly_fees}</span>
              </div>
              {finances.breakdown.free_rounds > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    {finances.breakdown.free_rounds} free first rounds
                  </span>
                  <span className="font-medium">$0</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              ${finances.total_paid_out.toFixed(0)}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {finances.breakdown.weeks_with_scores} Hot Rounds
                </span>
                <span className="font-medium">${finances.breakdown.hot_round_payouts}</span>
              </div>
              {finances.breakdown.second_place_payouts > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">2nd Place (20+ weeks)</span>
                  <span className="font-medium">${finances.breakdown.second_place_payouts}</span>
                </div>
              )}
              {finances.breakdown.low_raw_payouts > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Low Raw (20+ weeks)</span>
                  <span className="font-medium">${finances.breakdown.low_raw_payouts}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {finances.breakdown.weeks_with_ctp} CTPs × $20
                </span>
                <span className="font-medium">${finances.breakdown.ctp_payouts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {aces.length} Ace Payouts
                </span>
                <span className="font-medium">${finances.breakdown.ace_payouts}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-money" />
              Cash On Hand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${netBalance >= 0 ? 'text-money' : 'text-destructive'}`}>
              ${netBalance.toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total collected minus paid out
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ace Pool (reserved)</span>
                <span className="font-medium text-money">${finances.ace_pool.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">${(netBalance - finances.ace_pool).toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Structure */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fee Structure & Payouts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30 border border-border text-center">
                <div className="text-2xl font-bold">$25</div>
                <div className="text-sm text-muted-foreground">Membership</div>
              </div>
              <div className="p-4 rounded-lg bg-secondary/30 border border-border text-center">
                <div className="text-2xl font-bold">$5</div>
                <div className="text-sm text-muted-foreground">Weekly Round</div>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-center">
                <div className="text-2xl font-bold text-primary">$20+</div>
                <div className="text-sm text-muted-foreground">Hot Round</div>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/30 text-center">
                <div className="text-2xl font-bold text-accent">$20</div>
                <div className="text-sm text-muted-foreground">CTP</div>
              </div>
            </div>

            {/* Attendance-based payout tiers */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Weekly Payouts by Attendance</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Bigger turnouts unlock extra prizes. The remaining surplus is banked for the year-end tournament.
                These tiers apply starting Week 9.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Attendance</th>
                      <th className="text-center py-2 font-medium">Hot Round</th>
                      <th className="text-center py-2 font-medium">2nd Place</th>
                      <th className="text-center py-2 font-medium">Low Raw</th>
                      <th className="text-center py-2 font-medium">CTP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="py-2">Under 20</td>
                      <td className="text-center">$20</td>
                      <td className="text-center text-muted-foreground">—</td>
                      <td className="text-center text-muted-foreground">—</td>
                      <td className="text-center">$20</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2">20–24</td>
                      <td className="text-center font-medium text-primary">$25</td>
                      <td className="text-center">$10</td>
                      <td className="text-center">$5</td>
                      <td className="text-center">$20</td>
                    </tr>
                    <tr>
                      <td className="py-2">25+</td>
                      <td className="text-center font-medium text-primary">$30</td>
                      <td className="text-center">$15</td>
                      <td className="text-center">$10</td>
                      <td className="text-center">$20</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Aces */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Disc className="h-5 w-5 text-money" />
              Ace History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aces.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No aces yet this season
              </p>
            ) : (
              <div className="space-y-3">
                {aces.map((ace) => (
                  <div
                    key={ace.id}
                    className="p-3 rounded-lg bg-money/10 border border-money/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{ace.player.name}</div>
                      <Badge variant="secondary">${ace.payout}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(ace.date, "MMM d, yyyy")}
                      {ace.course_name && ` • ${ace.course_name}`}
                      {ace.hole_number && ` • Hole ${ace.hole_number}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Money Rankings */}
        {moneyRankings.length > 0 && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-money" />
                Money Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {moneyRankings.map((ranking, index) => (
                  <div
                    key={ranking.player_id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0 ? 'bg-money/10 border-money/30' : 'bg-muted/30 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-xl w-7 ${index === 0 ? 'text-money' : 'text-muted-foreground'}`}>
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{ranking.player_name}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {ranking.hot_round_wins > 0 && (
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-primary" />
                              {ranking.hot_round_wins} HR
                            </span>
                          )}
                          {ranking.second_place_wins > 0 && (
                            <span className="flex items-center gap-1">
                              <Medal className="h-3 w-3 text-silver" />
                              {ranking.second_place_wins} 2nd
                            </span>
                          )}
                          {ranking.low_raw_wins > 0 && (
                            <span className="flex items-center gap-1">
                              <Trophy className="h-3 w-3 text-accent" />
                              {ranking.low_raw_wins} Low Raw
                            </span>
                          )}
                          {ranking.ctp_wins > 0 && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-success" />
                              {ranking.ctp_wins} CTP
                            </span>
                          )}
                          {ranking.doubles_winnings > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-primary" />
                              ${ranking.doubles_winnings} Doubles
                            </span>
                          )}
                          {ranking.ace_payouts > 0 && (
                            <span className="flex items-center gap-1">
                              <Disc className="h-3 w-3 text-accent" />
                              ${ranking.ace_payouts} Ace
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${index === 0 ? 'text-money' : ''}`}>
                      ${ranking.total_winnings}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
