import { type FastifyInstance } from 'fastify';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import * as networkService from '../services/network.service';
import {
  ErrorResponse,
  NetworkIdParam,
  NodesReply,
  UploadNetworkBody,
  UploadNetworkReply,
} from '../schemas/network';

export async function networkRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<TypeBoxTypeProvider>();

  typedApp.post(
    '/network/upload',
    {
      schema: {
        tags: ['network'],
        summary: 'Upload a network definition',
        body: UploadNetworkBody,
        response: { 201: UploadNetworkReply, 400: ErrorResponse },
      },
    },
    async (request, reply) => {
      const result = await networkService.createNetwork(request.body);
      return reply.code(201).send(result);
    },
  );

  typedApp.get(
    '/network/nodes/:id',
    {
      schema: {
        tags: ['network'],
        summary: "List a network's nodes",
        params: NetworkIdParam,
        response: { 200: NodesReply, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const result = await networkService.getNodes(request.params.id);
      if (result === null) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: `network not found: ${request.params.id}` },
        });
      }
      return result;
    },
  );
}
