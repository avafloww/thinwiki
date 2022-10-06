import { PageMeta } from './pageMeta';

export interface Page {
  meta: PageMeta;
  text: string;
  children?: PageMeta[];
}
