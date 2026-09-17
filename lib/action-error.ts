// Turn a thrown value (usually a Supabase PostgrestError or an Error) into a
// message the admin UI can show. Falls back to the generic label.
export function actionErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message)
    if (message) return `${fallback}: ${message}`
  }
  return fallback
}
