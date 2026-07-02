import { useMutation } from "@tanstack/react-query";
import * as keysService from "@/services/keys.service";

export function useVerifyKey() {
  return useMutation({ mutationFn: keysService.verifyKey });
}
