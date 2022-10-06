import { file } from './file';
import { search } from './search';
import { reload } from './reload';
import { FastifyPluginAsync } from 'fastify';

export const routes: FastifyPluginAsync[] = [
  file,
  search,
  reload
];
