import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";
import { message } from "@/lib/query-client";

// Take-race (spec SV-PAGE-002-005 line 259): the backend's take is atomic, so the loser gets
// a 409 with a generic "Activation is no longer pending" — replaced here with the spec's own
// wording. `meta.silentErrorToast` opts this mutation out of the global generic-message toast
// (lib/query-client.ts) so this local one is the only one shown; the row itself disappears
// from the pool via the winner's `activation:taken` broadcast invalidating qk.activations.pending()
// for every connected activator, this loser included — no extra invalidation needed here.
export function useTakeActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.take,
    meta: { silentErrorToast: true },
    onSuccess: () => {
      toast.success(t("activator.requests.takenToast"));
      queryClient.invalidateQueries({ queryKey: qk.activations.pending() });
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      queryClient.invalidateQueries({ queryKey: qk.activators.myStats() });
    },
    onError: (err) => {
      if (axios.isCancel(err)) return;
      const isTakeRace = axios.isAxiosError(err) && err.response?.status === 409;
      toast.error(isTakeRace ? t("activator.requests.takeRaceToast") : message(err));
    },
  });
}
