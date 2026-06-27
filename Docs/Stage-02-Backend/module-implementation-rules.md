# Module Implementation Rules

**Role:** Senior Backend Architect & Developer.
**Stack:** Node/Express, Prisma, Zod 4, TypeScript.
**Architecture:** Monorepo — `apps/api`, `packages/contract`.
**Constraint:** Strict **6-file architecture** + **manual dependency injection** (no DI frameworks).

---

## 1. Foundations You Must Assume Exist

Built in earlier stages — use them, never redefine:
1. **Prisma models** — `prisma/schema.prisma`.
2. **Contract** — DTOs, Commands, Queries, route constants, enums, and event types in `@my-app/contract`.
3. **Shared middleware** — `validateRequest` and `requireAuth` in `@common/middlewares`.
4. **Prisma singleton** — `@common/db/prisma`.
5. **Typed event bus** — `@common/events/event-bus` (keyed by contract event types).
6. **Response helper** — `sendSuccess` in `@common/http/response`.

---

## 2. The Strict File Structure

Inside `apps/api/src/modules/[module]/`, generate in this order. Create a file **only if the module needs it** (a read-only module has no listener; a module that emits nothing still may listen, etc.).

1. `[name].mapper.ts` — pure Entity ⇄ DTO transformation.
2. `[name].interface.ts` — the service contract (dependency inversion).
3. `[name].service.ts` — business logic (implements the interface).
4. `[name].listener.ts` — (optional) handles inbound events.
5. `[name].controller.ts` — HTTP handler (depends on the interface).
6. `[name].routes.ts` — wiring + entry point (the composition root).

---

## 3. Standards

- **Routes:** import constants from the contract — `router.get(USER_ROUTES.GET_BY_ID, ...)`, never a string literal.
- **Validation:** in the route file, before the controller — `validateRequest({ params: UserIdParamsSchema })`, `validateRequest({ body: CreateUserSchema })`. Controllers read coerced input from `req.validated`, never raw `req.query`/`req.params`.
- **Manual DI (constructor injection):** Controller receives `IService`; Service receives `PrismaClient`; Listener receives `IService`. Everything is instantiated and linked in `routes.ts`.
- **Data flow:** Route (validate) → Controller (read `req.validated`) → Service (DTO in → entity → DB → DTO out) → Controller (`sendSuccess`).
- **Responses:** always the `ApiResponse<T>` envelope via `sendSuccess`. Set the right status (`201` for create, `200` for read/update, `204` for delete).

---

## 4. File-by-File

### `[name].mapper.ts`
Pure, static. **Exclude sensitive fields by listing what you return** (never spread the entity). Convert `Date → ISO string` to satisfy the contract DTO. Map the Prisma enum value onto the contract enum.

```typescript
import type { User } from '@prisma/client';
import { UserResponseSchema, type UserDTO, UserRole } from '@my-app/contract';
import type { CreateUserCommand } from '@my-app/contract';

export class UserMapper {
  static toDTO(entity: User): UserDTO {
    const dto: UserDTO = {
      id: entity.id,
      email: entity.email,
      role: entity.role as UserRole,
      createdAt: entity.createdAt.toISOString(), // contract DTO is z.iso.datetime()
    };
    return UserResponseSchema.parse(dto); // dev/test conformance guard
  }

  static toPersistence(cmd: CreateUserCommand) {
    return { email: cmd.email /* password hashing happens in the service */ };
  }
}
```

### `[name].interface.ts`
Methods return **DTOs** (from the contract), never Prisma entities.

```typescript
import type { CreateUserCommand, UserDTO } from '@my-app/contract';

export interface IUserService {
  create(cmd: CreateUserCommand): Promise<UserDTO>;
  findById(id: string): Promise<UserDTO>;
}
```

### `[name].service.ts`
Injects `PrismaClient`. Throws `AppError` subclasses. Emits typed events on state change.

```typescript
import type { PrismaClient } from '@prisma/client';
import type { IUserService } from './user.interface';
import { UserMapper } from './user.mapper';
import { NotFoundError } from '@common/errors';
import { eventBus } from '@common/events/event-bus';
import { PasswordUtils } from '@common/utils/password.utils';
import type { CreateUserCommand, UserDTO } from '@my-app/contract';

export class UserService implements IUserService {
  constructor(private prisma: PrismaClient) {}

  async create(cmd: CreateUserCommand): Promise<UserDTO> {
    const password = await PasswordUtils.hash(cmd.password);
    const user = await this.prisma.user.create({ data: { ...UserMapper.toPersistence(cmd), password } });
    const dto = UserMapper.toDTO(user);
    eventBus.emit('user:registered', { user: dto, timestamp: new Date().toISOString() });
    return dto;
  }

  async findById(id: string): Promise<UserDTO> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User');
    return UserMapper.toDTO(user);
  }
}
```

### `[name].listener.ts` (optional)
Injects `IService`; subscribes to typed events.

```typescript
import { eventBus } from '@common/events/event-bus';
import type { IUserService } from './user.interface';

export class UserListener {
  constructor(private service: IUserService) {}
  setup(): void {
    eventBus.on('order:created', async (payload) => {
      await this.service.handleOrderCreated(payload);
    });
  }
}
```

### `[name].controller.ts`
Thin. `try/catch` → `next(error)`. Reads `req.validated`. Responds via `sendSuccess`.

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { IUserService } from './user.interface';
import { sendSuccess } from '@common/http/response';
import type { CreateUserCommand, UserIdParams } from '@my-app/contract';

export class UserController {
  constructor(private service: IUserService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.create(req.validated.body as CreateUserCommand);
      sendSuccess(res, result, 201);
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.validated.params as UserIdParams;
      sendSuccess(res, await this.service.findById(id));
    } catch (error) { next(error); }
  };
}
```
(Arrow-method fields bind `this`, so no `.bind()` is needed at wiring time.)

### `[name].routes.ts` (composition root)

```typescript
import { Router } from 'express';
import { prisma } from '@common/db/prisma';
import { validateRequest } from '@common/middlewares/validate-request.middleware';
import { requireAuth } from '@common/middlewares/auth.middleware';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { USER_ROUTES, CreateUserSchema, UserIdParamsSchema } from '@my-app/contract';

const router = Router();

// 1. Manual DI
const service = new UserService(prisma);
const controller = new UserController(service);
// const listener = new UserListener(service); listener.setup();

// 2. Routes (validation uses contract schemas per segment)
router.post(USER_ROUTES.BASE, validateRequest({ body: CreateUserSchema }), controller.create);
router.get(USER_ROUTES.GET_BY_ID, requireAuth(), validateRequest({ params: UserIdParamsSchema }), controller.getById);

export { router };
```

---

## 5. Best Practices

1. Controllers stay thin; logic lives in services.
2. Always paginate list endpoints (use the contract's `GetXQuery` + the `paginated()` factory).
3. Use Prisma `select` to fetch only needed fields.
4. Always `async/await`; services return `Promise<DTO>`.
5. File uploads: Multer, restrict MIME + size (from `env`), store path/URL only.
6. Document routes (OpenAPI) — optional but encouraged.

## 6. Conformance

Every service method returns a DTO that **parses** against its contract schema (the mapper enforces this). Every route registered uses a contract route constant. The integration suite asserts both (see `test-rules.md` §7).
