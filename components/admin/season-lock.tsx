"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { lockSeason } from "@/app/actions/seasons"

// Freezes the season into the Seasons page. Once locked it can't be edited.
export function SeasonLock({ lockedYears, seasonYear }: { lockedYears: number[]; seasonYear: number }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const locked = lockedYears.includes(seasonYear)

  const handleLock = async () => {
    setLoading(true)
    try {
      const res = await lockSeason(seasonYear)
      if (!res.success) alert(res.error ?? "Failed to lock season")
      setConfirmOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-gold/40">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4 text-gold" /> {seasonYear} Season
          </div>
          <p className="text-sm text-muted-foreground">
            {locked
              ? "Locked. The results are saved on the Seasons page and can't be changed."
              : "Press once after the last event of the year. Saves the results to the Seasons page permanently."}
          </p>
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            <CheckCircle2 className="h-4 w-4" /> Locked
          </span>
        ) : (
          <Button onClick={() => setConfirmOpen(true)} className="gap-2 bg-gold text-black hover:bg-gold/90">
            <Lock className="h-4 w-4" /> Lock {seasonYear} Season
          </Button>
        )}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Lock the {seasonYear} season?</AlertDialogTitle>
            <AlertDialogDescription>
              This saves the {seasonYear} results exactly as they are now. After this they can&apos;t be edited or deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLock} disabled={loading} className="bg-gold text-black hover:bg-gold/90">
              {loading ? "Locking..." : `Lock ${seasonYear}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
