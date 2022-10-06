import ThinWiki from '../../main';
import { FastifyInstance } from 'fastify';

interface SearchRequest {
  query: string;
}

export async function search(fastify: FastifyInstance) {
  fastify.post<{ Body: SearchRequest }>('/search', async (request, reply) => {
    return ThinWiki.storage.search(request.body.query);
  });
}
