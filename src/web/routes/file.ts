import ThinWiki from '../../main';
import { FastifyInstance } from 'fastify';

const log = require('debug')('wiki:web:file');

export async function file(fastify: FastifyInstance) {
  fastify.get('/*', async (request, reply) => {
    let url = request.url;
    if (url.startsWith('/')) {
      url = url.substring(1);
    }

    const page = ThinWiki.storage.get(url);
    if (!page) {
      reply.status(404);
      return 'not found';
    }

    reply.status(200);
    return page;
  });
}
