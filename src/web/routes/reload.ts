import ThinWiki from '../../main';
import { FastifyInstance } from 'fastify';

const log = require('debug')('wiki:web:reload');

interface ReloadRequest {
  token: string;
}

export async function reload(fastify: FastifyInstance) {
  fastify.post<{ Body: ReloadRequest }>('/', async (request, reply) => {
    if (request.body?.token !== process.env.RELOAD_TOKEN) {
      log('/ - reload - invalid token');
      reply.code(403);
      return 'invalid token';
    }

    log('/ - reload - ok');

    await ThinWiki.storage.initialize();
    reply.code(200);
    return 'ok';
  });
}
