import {
  ClientActivationStatus,
  type VerifyKeyCommand,
  type KeyVerificationDTO,
  type SubmitActivationCommand,
  type UpdateActivationCommand,
  type SubmitAdditionalInfoCommand,
  type ClientActivationStatusDTO,
} from "@my-app/contract";

// TODO(Sub-02): api.post(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.VERIFY), command)
export async function verifyKey(_command: VerifyKeyCommand): Promise<KeyVerificationDTO> {
  return { status: ClientActivationStatus.INVALID };
}

// TODO(Sub-02): api.post(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.SUBMIT), command)
export async function submitActivation(_command: SubmitActivationCommand): Promise<void> {
  return;
}

// TODO(Sub-02): api.patch(withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.UPDATE), { activationId }), command)
export async function updateActivation(_activationId: string, _command: UpdateActivationCommand): Promise<void> {
  return;
}

// TODO(Sub-02): api.post(withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.ADDITIONAL), { activationId }), command)
export async function submitAdditionalInfo(_activationId: string, _command: SubmitAdditionalInfoCommand): Promise<void> {
  return;
}

// TODO(Sub-02): api.get(withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.STATUS), { activationId }))
export async function getActivationStatus(activationId: string): Promise<ClientActivationStatusDTO> {
  return { activationId, status: ClientActivationStatus.INVALID };
}
