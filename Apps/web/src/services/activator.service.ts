import type { ActivatorDashboardDTO } from "@my-app/contract";

// TODO(Sub-02): api.get(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.MY_STATS))
export async function getMyStats(): Promise<ActivatorDashboardDTO> {
  return {
    totalEarnings: 0,
    earningsTrendPercent: 0,
    creditsBalance: 0,
    totalActivations: 0,
    activationsToday: 0,
    avgActivationTimeSeconds: null,
    activeSlotsUsed: 0,
    weekly: [],
  };
}
