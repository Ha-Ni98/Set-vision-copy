import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FreezeRequestCommand } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";

export function useFreezeActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: FreezeRequestCommand }) =>
      activationsService.freeze(id, command),
    onSuccess: () => {
      toast.success(t("activator.requests.card.adminToast"));
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      // Deliberately still the raw ["activator","my-stats"] literal — see useTakeActivation.
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
      queryClient.invalidateQueries({ queryKey: qk.activations.myHistoryAll() });
      queryClient.invalidateQueries({ queryKey: qk.activations.recent() });
    },
  });
}
