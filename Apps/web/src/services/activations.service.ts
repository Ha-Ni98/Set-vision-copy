import type {
  ActiveRequestDTO,
  PendingActivationDTO,
  PaginatedActivatorHistory,
  RecentActivationDTO,
  GetActivatorHistoryQuery,
  FlagWrongInfoCommand,
  RequestAdditionalInfoCommand,
  FreezeRequestCommand,
} from "@my-app/contract";

// TODO(Sub-02): api.get(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ACTIVE))
export async function getActive(): Promise<ActiveRequestDTO[]> {
  return [];
}

// TODO(Sub-02): api.get(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_PENDING))
export async function getPending(): Promise<PendingActivationDTO[]> {
  return [];
}

// TODO(Sub-02): api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.TAKE), { id }))
export async function take(_id: string): Promise<void> {
  return;
}

// TODO(Sub-02): api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FLAG_WRONG), { id }), command)
export async function flagWrongInfo(_id: string, _command: FlagWrongInfoCommand): Promise<void> {
  return;
}

// TODO(Sub-02): api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.REQUEST_ADDITIONAL), { id }), command)
export async function requestAdditionalInfo(_id: string, _command: RequestAdditionalInfoCommand): Promise<void> {
  return;
}

// No contract command exists yet for this action (codebase-map §8.Q4) — stays a typed
// no-op until an ActivateCommand lands upstream.
export async function activate(_id: string): Promise<void> {
  return;
}

// TODO(Sub-02): api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.RELEASE), { id }))
export async function release(_id: string): Promise<void> {
  return;
}

// TODO(Sub-02): api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FREEZE), { id }), command)
export async function freeze(_id: string, _command: FreezeRequestCommand): Promise<void> {
  return;
}

// TODO(Sub-02): api.get(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_MY_HISTORY), { params: query })
export async function getMyHistory(query: GetActivatorHistoryQuery): Promise<PaginatedActivatorHistory> {
  return { items: [], meta: { page: query.page ?? 1, limit: query.limit ?? 10, total: 0, totalPages: 0 } };
}

// TODO(Sub-02): api.get(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_RECENT))
export async function getRecent(): Promise<RecentActivationDTO[]> {
  return [];
}
