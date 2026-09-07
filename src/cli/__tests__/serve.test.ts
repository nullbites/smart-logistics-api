import { runServe, installSignalHandlers } from '../commands/serve';

describe('runServe', () => {
  let running: { stop: () => Promise<void> } | undefined;

  afterEach(async () => {
    if (running) {
      await running.stop();
      running = undefined;
    }
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('listens on an ephemeral port and serves /health', async () => {
    const server = await runServe({
      port: 0,
      host: '127.0.0.1',
      verbose: false,
      migrate: false,
      seed: false,
      logger: false,
    });
    running = server;

    expect(server.address).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const res = await fetch(`${server.address}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown;
    expect(body).toMatchObject({ status: 'ok' });
  });

  it('has an idempotent stop()', async () => {
    const server = await runServe({
      port: 0,
      host: '127.0.0.1',
      verbose: false,
      migrate: false,
      seed: false,
      logger: false,
    });
    running = server;

    await server.stop();
    await expect(server.stop()).resolves.toBeUndefined();
    running = undefined;
  });

  it('installs SIGINT and SIGTERM handlers', () => {
    const before = process.listenerCount('SIGINT');
    installSignalHandlers(async () => {});
    expect(process.listenerCount('SIGINT')).toBe(before + 1);
    expect(process.listenerCount('SIGTERM')).toBeGreaterThanOrEqual(1);
  });
});
