import axios from "axios";
import { AUTH_ROUTES } from "@my-app/contract";

// Exactly one axios instance (rules §3A). Auth is cookie-based (withCredentials) — no
// token is ever read or attached from JS. This file does no UI/toasts/domain transforms.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Bridges the 401 redirect to React Router without a hard reload mid-session. Registered
// once at app startup via the data router's own `navigate()` (see src/App.tsx); falls back
// to window.location if nothing has registered yet.
let redirect: ((path: string) => void) | null = null;
export function setRedirect(fn: (path: string) => void) {
  redirect = fn;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl: string = error.config?.url ?? "";
      const isAuthEndpoint = requestUrl.includes(AUTH_ROUTES.BASE);
      const alreadyOnLogin = typeof window !== "undefined" && window.location.pathname === "/login";
      if (!isAuthEndpoint && !alreadyOnLogin) {
        if (redirect) redirect("/login");
        else if (typeof window !== "undefined") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
