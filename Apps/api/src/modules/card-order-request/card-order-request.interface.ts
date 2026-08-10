import type {
  CardOrderRequestDTO,
  LinkableCardOrderRequestDTO,
  PaginatedCardOrderRequests,
  GetCardOrderRequestsQuery,
  GetMyCardOrderRequestsQuery,
  CreateCardOrderRequestCommand,
  ReviewCardOrderRequestCommand,
} from '@my-app/contract';

export interface ICardOrderRequestService {
  getAll(query: GetCardOrderRequestsQuery): Promise<PaginatedCardOrderRequests>;
  getMine(userId: string, query: GetMyCardOrderRequestsQuery): Promise<PaginatedCardOrderRequests>;
  getLinkable(): Promise<LinkableCardOrderRequestDTO[]>;
  getById(id: string): Promise<CardOrderRequestDTO>;
  create(userId: string, cmd: CreateCardOrderRequestCommand): Promise<CardOrderRequestDTO>;
  approve(id: string, cmd: ReviewCardOrderRequestCommand, actorId: string): Promise<CardOrderRequestDTO>;
  reject(id: string, cmd: ReviewCardOrderRequestCommand, actorId: string): Promise<CardOrderRequestDTO>;
  cancel(id: string, userId: string): Promise<CardOrderRequestDTO>;
  unlink(id: string, actorId: string): Promise<CardOrderRequestDTO>;
}
