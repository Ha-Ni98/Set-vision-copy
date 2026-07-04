import { createContext, useContext, useState, type ReactNode } from "react";
import type {
  AccountFieldValue,
  AccountInformation,
  ClientActivationStatus,
} from "@my-app/contract";

// Promoted from types/key-flow.ts's KeyFlowView (client-portal plan.md §D1) — this holds the
// flow's raw verification data, not a pre-computed "which screen to show" decision. Deciding
// which view a given `status` maps to is a separate concern (the Step 1 status→view dispatch,
// Sprint 3), derived from `status` wherever a page needs it — this context never needs to
// know about UI screens, only about what the backend last told it.
export interface ActivationData {
  key: string;
  status: ClientActivationStatus;
  planKey?: string;
  activationId?: string;
  subscriptionLabel?: string;
  submittedFields?: AccountFieldValue[];
  flaggedFields?: { field: AccountInformation; label: string }[];
  requestedFields?: { field: AccountInformation; label: string }[];
  accountUsername?: string;
}

interface ActivationContextValue {
  /** `null` = nothing verified yet (Step 1). */
  activation: ActivationData | null;
  setActivation: (data: ActivationData) => void;
  /**
   * Clears the flow back to Step 1 — the context's own half of "Check Another Key"
   * (plan.md §D1). The *socket* teardown (`unsubscribeActivation`) is a realtime concern
   * layered on top by the button itself once Sprint 4 wires it in, not this context's job.
   */
  reset: () => void;
}

const Ctx = createContext<ActivationContextValue | null>(null);

export function ActivationProvider({ children }: { children: ReactNode }) {
  const [activation, setActivation] = useState<ActivationData | null>(null);

  return (
    <Ctx.Provider value={{ activation, setActivation, reset: () => setActivation(null) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActivation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useActivation outside provider");
  return c;
}
