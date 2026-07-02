// Verbatim from front-end-rules.md §3B — services and any future MSW handlers use this
// same builder so route composition can never drift between them.
export const apiPath = (...parts: string[]): string =>
  ("/" + parts.join("/")).replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";

export const withParams = (path: string, params: Record<string, string>): string =>
  path.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k]));
