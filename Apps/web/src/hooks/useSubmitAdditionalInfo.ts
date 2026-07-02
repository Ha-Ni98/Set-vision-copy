import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitAdditionalInfoCommand } from "@my-app/contract";
import * as keysService from "@/services/keys.service";
import { qk } from "@/lib/query-keys";

export function useSubmitAdditionalInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      activationId,
      command,
    }: {
      activationId: string;
      command: SubmitAdditionalInfoCommand;
    }) => keysService.submitAdditionalInfo(activationId, command),
    onSuccess: (_data, { activationId }) => {
      queryClient.invalidateQueries({ queryKey: qk.keys.status(activationId) });
    },
  });
}
