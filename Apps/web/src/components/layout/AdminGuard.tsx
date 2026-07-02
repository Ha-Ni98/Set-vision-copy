import { Outlet } from "react-router-dom";

// Passthrough stub — fleshed out in Sprint 2 with the real session/role gate
// (resolving → full-page spinner; invalid/expired → redirect; non-admin → redirect).
export function AdminGuard() {
  return <Outlet />;
}
