import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a DATE column value ("YYYY-MM-DD"). `new Date("2026-09-17")` parses
 * as UTC midnight, which displays as the previous day anywhere west of UTC;
 * parseISO treats a date-only string as local midnight instead.
 */
export function formatDate(date: string | Date, formatStr: string): string {
  return format(typeof date === "string" ? parseISO(date) : date, formatStr)
}

/** Today's date as "YYYY-MM-DD" in the user's local timezone (for date inputs). */
export function todayDateString(): string {
  return format(new Date(), "yyyy-MM-dd")
}
