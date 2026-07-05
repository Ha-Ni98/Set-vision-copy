import { apiPath } from "@/lib/api-path";

// The same builder services use (test-rules §3) — handler URLs can never drift from what
// the app actually requests.
export const apiUrl = (...parts: string[]): string =>
  import.meta.env.VITE_API_URL + apiPath(...parts);
