import { file } from './file';
import { reload } from './reload';
import { FastifyPluginAsync } from 'fastify';

export const routes: FastifyPluginAsync[] = [
  file,
  reload
];
