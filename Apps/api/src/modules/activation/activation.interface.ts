import type {
  KeyVerificationDTO,
  ClientActivationStatusDTO,
  PendingActivationDTO,
  ActiveRequestDTO,
  ActivatorHistoryItemDTO,
  RecentActivationDTO,
  AdminActivationDTO,
  ActivationDetailDTO,
  DistributorActivationDTO,
  DistributorActivationDetailDTO,
  PaginatedResult,
  VerifyKeyCommand,
  SubmitActivationCommand,
  UpdateActivationCommand,
  SubmitAdditionalInfoCommand,
  FlagWrongInfoCommand,
  RequestAdditionalInfoCommand,
  FreezeRequestCommand,
  SetActivatorPriceCommand,
  SetActivationCostCommand,
  GetActivationsQuery,
  GetActivatorHistoryQuery,
  GetDistributorActivationsQuery,
  ActivateActivationCommand,
} from '@my-app/contract';

export interface IActivationService {
  // Client (public)
  verify(cmd: VerifyKeyCommand): Promise<KeyVerificationDTO>;
  submit(cmd: SubmitActivationCommand): Promise<ClientActivationStatusDTO>;
  update(activationId: string, cmd: UpdateActivationCommand): Promise<ClientActivationStatusDTO>;
  additional(activationId: string, cmd: SubmitAdditionalInfoCommand): Promise<ClientActivationStatusDTO>;
  status(activationId: string): Promise<ClientActivationStatusDTO>;

  // Activator (principalUserId → resolves Activator by userId)
  getPending(): Promise<PendingActivationDTO[]>;
  getActive(principalUserId: string): Promise<ActiveRequestDTO[]>;
  take(id: string, principalUserId: string): Promise<ActiveRequestDTO>;
  flagWrong(id: string, principalUserId: string, cmd: FlagWrongInfoCommand): Promise<ActiveRequestDTO>;
  requestAdditional(id: string, principalUserId: string, cmd: RequestAdditionalInfoCommand): Promise<ActiveRequestDTO>;
  activate(id: string, principalUserId: string, cmd: ActivateActivationCommand): Promise<ActiveRequestDTO>;
  cancel(id: string, principalUserId: string): Promise<void>;
  release(id: string, principalUserId: string): Promise<void>;
  freeze(id: string, principalUserId: string, cmd: FreezeRequestCommand): Promise<ActiveRequestDTO>;
  getMyHistory(principalUserId: string, query: GetActivatorHistoryQuery): Promise<PaginatedResult<ActivatorHistoryItemDTO>>;
  getRecent(): Promise<RecentActivationDTO[]>;

  // Admin
  getAll(query: GetActivationsQuery): Promise<PaginatedResult<AdminActivationDTO>>;
  getById(id: string): Promise<ActivationDetailDTO>;
  activateByAdmin(id: string, cmd: ActivateActivationCommand): Promise<AdminActivationDTO>;
  cancelByAdmin(id: string): Promise<AdminActivationDTO>;
  setPrice(id: string, cmd: SetActivatorPriceCommand, actorId: string): Promise<AdminActivationDTO>;
  setCost(id: string, cmd: SetActivationCostCommand, actorId: string): Promise<AdminActivationDTO>;

  // Distributor (principalUserId → resolves Distributor by userId)
  getOnMyCards(
    principalUserId: string,
    query: GetDistributorActivationsQuery,
  ): Promise<PaginatedResult<DistributorActivationDTO>>;
  getOnMyCardsById(principalUserId: string, id: string): Promise<DistributorActivationDetailDTO>;
}
