import type {
  CardRevocationRequestDTO,
  RevocableCardDTO,
  PaginatedCardRevocationRequests,
  GetCardRevocationRequestsQuery,
  GetMyCardRevocationRequestsQuery,
  CreateCardRevocationRequestCommand,
  ReviewCardRevocationRequestCommand,
} from '@my-app/contract';

export interface ICardRevocationRequestService {
  getAll(query: GetCardRevocationRequestsQuery): Promise<PaginatedCardRevocationRequests>;
  getMine(userId: string, query: GetMyCardRevocationRequestsQuery): Promise<PaginatedCardRevocationRequests>;
  getEligible(userId: string): Promise<RevocableCardDTO[]>;
  getById(id: string): Promise<CardRevocationRequestDTO>;
  create(userId: string, cmd: CreateCardRevocationRequestCommand): Promise<CardRevocationRequestDTO>;
  approve(id: string, cmd: ReviewCardRevocationRequestCommand, actorId: string): Promise<CardRevocationRequestDTO>;
  reject(id: string, cmd: ReviewCardRevocationRequestCommand, actorId: string): Promise<CardRevocationRequestDTO>;
  cancel(id: string, userId: string): Promise<CardRevocationRequestDTO>;
}
