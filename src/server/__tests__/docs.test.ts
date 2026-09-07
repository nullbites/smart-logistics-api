import { type FastifyInstance } from 'fastify';
import { buildApp } from '../app';

describe('API documentation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the OpenAPI document at /docs/json', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as {
      openapi: string;
      info: { title: string };
      paths: Record<string, { get?: unknown }>;
    };

    expect(body.openapi).toMatch(/^3\./);
    expect(body.info.title).toBe('Smart Logistics Routing API');
    expect(body.paths['/health']).toBeDefined();
    expect(body.paths['/health']?.get).toBeDefined();
  });

  it('serves the Swagger UI at /docs', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });
    expect([200, 302]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(res.headers['content-type']).toContain('text/html');
    } else {
      const withSlash = await app.inject({ method: 'GET', url: '/docs/' });
      expect(withSlash.statusCode).toBe(200);
      expect(withSlash.headers['content-type']).toContain('text/html');
    }
  });

  it('serves the Swagger UI index at /docs/', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/' });
    expect(res.statusCode).toBeLessThan(400);
  });
});
