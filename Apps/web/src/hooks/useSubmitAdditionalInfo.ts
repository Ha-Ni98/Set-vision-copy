import { useMutation } from "@tanstack/react-query";
import type { SubmitAdditionalInfoCommand } from "@my-app/contract";
import * as keysService from "@/services/keys.service";

export function useSubmitAdditionalInfo() {
  return useMutation({
    mutationFn: ({ activationId, command }: { activationId: string; command: SubmitAdditionalInfoCommand }) =>
      keysService.submitAdditionalInfo(activationId, command),
  });
}
