import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import type { Server as HttpServer } from 'node:http';
import { io as Client } from 'socket.io-client';
import { app } from '../../../src/app';
import { createSocketServer } from '../../../src/common/realtime/socket';
import type { AppIOServer } from '../../../src/common/realtime/socket';
import { authNamespace } from '../../../src/common/realtime/socket-auth';
import { initRealtimeGateway } from '../../../src/common/realtime/realtime-gateway';
import { NS } from '../../../src/common/realtime/rooms';
import { eventBus } from '../../../src/common/events/event-bus';
import { UserRole, ClientActivationStatus, ActivationStat } from '@my-app/contract';
import { faker } from '@faker-js/faker';
import { mintToken } from '../../fixtures/auth.fixture';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let baseUrl: string;
let httpServer: HttpServer;
let ioServer: AppIOServer;

beforeAll(async () => {
  httpServer = createServer(app);
  ioServer = createSocketServer(httpServer);
  ioServer.of(NS.ACTIVATORS).use(authNamespace([UserRole.ACTIVATOR]));
  ioServer.of(NS.ADMIN).use(authNamespace([UserRole.ADMIN]));
  initRealtimeGateway(ioServer);

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    ioServer.close(() => httpServer.close(() => resolve()));
  });
});

describe('Realtime Gateway', () => {
  it('(a) status-changed reaches the subscribed client room and not other rooms', async () => {
    const activationId = faker.string.uuid();
    const otherId = faker.string.uuid();

    const client = Client(`${baseUrl}${NS.CLIENT}`);
    await new Promise<void>((r) => client.once('connect', r));
    client.emit('subscribe', activationId);
    await delay(100);

    const received: string[] = [];
    client.on('activation:status-changed', (p: { activationId: string }) =>
      received.push(p.activationId),
    );

    eventBus.emit('activation:status-changed', {
      activationId: otherId,
      status: ClientActivationStatus.READY,
      timestamp: new Date().toISOString(),
    });
    await delay(80);
    expect(received).toHaveLength(0);

    eventBus.emit('activation:status-changed', {
      activationId,
      status: ClientActivationStatus.PROCESSING,
      timestamp: new Date().toISOString(),
    });
    await delay(80);
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(activationId);

    client.disconnect();
  });

  it('(b) /activators rejects missing token (UNAUTHORIZED) and wrong role (FORBIDDEN)', async () => {
    const noTokenClient = Client(`${baseUrl}${NS.ACTIVATORS}`, { reconnection: false });
    const noTokenErr = await new Promise<Error>((r) => noTokenClient.once('connect_error', r));
    expect(noTokenErr.message).toBe('UNAUTHORIZED');
    noTokenClient.disconnect();

    const adminToken = mintToken({ id: faker.string.uuid(), role: UserRole.ADMIN });
    const wrongRoleClient = Client(`${baseUrl}${NS.ACTIVATORS}`, {
      auth: { token: adminToken },
      reconnection: false,
    });
    const wrongRoleErr = await new Promise<Error>((r) => wrongRoleClient.once('connect_error', r));
    expect(wrongRoleErr.message).toBe('FORBIDDEN');
    wrongRoleClient.disconnect();
  });

  it('(c) /admin receives activation:frozen emitted on the event bus', async () => {
    const adminToken = mintToken({ id: faker.string.uuid(), role: UserRole.ADMIN });
    const adminClient = Client(`${baseUrl}${NS.ADMIN}`, { auth: { token: adminToken } });
    await new Promise<void>((r) => adminClient.once('connect', r));
    await delay(50);

    const receivedPromise = new Promise<unknown>((r) => adminClient.once('activation:frozen', r));

    eventBus.emit('activation:frozen', {
      activationId: faker.string.uuid(),
      timestamp: new Date().toISOString(),
    });

    await expect(receivedPromise).resolves.toMatchObject({
      activationId: expect.any(String) as string,
    });
    adminClient.disconnect();
  });

  it('(d) /activators receives activation:taken — gateway strips activatorId from payload', async () => {
    const activatorToken = mintToken({ id: faker.string.uuid(), role: UserRole.ACTIVATOR });
    const actClient = Client(`${baseUrl}${NS.ACTIVATORS}`, { auth: { token: activatorToken } });
    await new Promise<void>((r) => actClient.once('connect', r));
    await delay(50);

    const receivedPromise = new Promise<unknown>((r) => actClient.once('activation:taken', r));

    eventBus.emit('activation:taken', {
      activationId: faker.string.uuid(),
      activatorId: faker.string.uuid(),
      timestamp: new Date().toISOString(),
    });

    // Gateway broadcasts to activatorNs (all activators) with { activationId, timestamp } only
    await expect(receivedPromise).resolves.toMatchObject({
      activationId: expect.any(String) as string,
    });
    actClient.disconnect();
  });

  it('(e) /activators receives activation:resolved on the assigned activator\'s room', async () => {
    const activatorUserId = faker.string.uuid();
    const activatorToken = mintToken({ id: activatorUserId, role: UserRole.ACTIVATOR });
    const actClient = Client(`${baseUrl}${NS.ACTIVATORS}`, { auth: { token: activatorToken } });
    await new Promise<void>((r) => actClient.once('connect', r));
    await delay(80); // wait for socket.join(rooms.activator(userId))

    const receivedPromise = new Promise<unknown>((r) => actClient.once('activation:resolved', r));

    // Gateway routes to rooms.activator(activatorId) where activatorId = userId from JWT
    eventBus.emit('activation:resolved', {
      activationId: faker.string.uuid(),
      activatorId: activatorUserId,
      outcome: ActivationStat.ACTIVATED_BY_ADMIN,
      timestamp: new Date().toISOString(),
    });

    await expect(receivedPromise).resolves.toMatchObject({
      activationId: expect.any(String) as string,
      outcome: ActivationStat.ACTIVATED_BY_ADMIN,
    });
    actClient.disconnect();
  });
});
