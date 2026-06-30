import type {
  AuthTokensDTO,
  SessionUserDTO,
  LoginCommand,
  RefreshTokenCommand,
} from '@my-app/contract';
import type { JWTPayload } from '@my-app/contract';

export interface IAuthService {
  login(cmd: LoginCommand): Promise<AuthTokensDTO>;
  refresh(cmd: RefreshTokenCommand): Promise<AuthTokensDTO>;
  logout(cmd: RefreshTokenCommand): Promise<void>;
  me(principal: JWTPayload): Promise<SessionUserDTO>;
}
