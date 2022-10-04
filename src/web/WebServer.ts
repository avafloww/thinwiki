import Fastify from 'fastify';
import { routes } from './routes';

const log = require('debug')('wiki:web');

export class WebServer {
  private fastify = Fastify();

  async bootstrap() {
    const port = parseInt(process.env.PORT ?? '3000');

    log('registering routes');
    this.fastify.register(require('@fastify/cors'), { origin: '*' });
    for (const route of routes) {
      this.fastify.register(route);
    }

    log(`running on port ${port}`);
    try {
      await this.fastify.listen({ port });
    } catch (err) {
      log(err);
      console.error(err);

      log(`exiting`);
      process.exit(1);
    }
  }
}
