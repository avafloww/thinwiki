import { Page } from './page';
import { createWriteStream } from 'fs';
import * as matter from 'gray-matter';
import { PageMeta } from './pageMeta';
import { https } from 'follow-redirects';
import { file as tempFile } from 'tmp-promise';
import * as yauzl from 'yauzl';

const log = require('debug')('wiki:storage');

export class Storage {
  private cache: Map<string, Page> = new Map();

  async initialize() {
    const { path, cleanup } = await tempFile();
    const storage = this;

    return new Promise<void>((resolve, reject) => {
      const repoName = process.env.GITHUB_REPO;
      const repoBranch = process.env.GITHUB_REPO_BRANCH ?? 'main';

      if (!repoName) {
        return reject(new Error('GITHUB_REPO is not set'));
      }

      const ws = createWriteStream(path);
      https.get({
          hostname: 'github.com',
          path: `/${repoName}/zipball/${repoBranch}`,
          headers: {
            'User-Agent': 'https://github.com/avafloww/thinwiki',
          }
        }, function (response) {
          if (response.statusCode !== 200) {
            reject(new Error(`failed to get zipball of repo ${repoName} @ ${repoBranch}: ${response.statusCode}`));
            return;
          }

          response.pipe(ws);

          ws.on('finish', () => {
            log(`downloaded zipball for ${repoName} @ ${repoBranch}`);
            ws.close();
            storage.load(path)
              .then(() => resolve())
              .catch(reject);
          });
        }
      );
    }).finally(() => cleanup());
  }

  private async load(path: string) {
    this.cache.clear();
    const storage = this;

    const prevUsage = process.memoryUsage();
    await new Promise<void>((resolve) => {
      yauzl.open(path, { lazyEntries: true }, function (err, zip) {
        zip.on('end', function () {
          resolve();
        });

        zip.on('entry', function (entry: yauzl.Entry) {
          // remove the root directory
          const path = entry.fileName.split('/').splice(1);
          const filename = path[path.length - 1];

          for (const component of path) {
            // ignore dotfiles and dotdirs
            if (component.startsWith('.')) {
              return zip.readEntry();
            }
          }

          // only parse markdown files
          if (!filename.endsWith('.md')) {
            return zip.readEntry();
          }

          zip.openReadStream(entry, function (err, readStream) {
            if (err) {
              throw err;
            }

            let fileContents = '';
            readStream.on('data', function (data) {
              fileContents += data;
            });

            readStream.on('end', function () {
              storage.processFile(path.join('/'), fileContents)
                .finally(() => zip.readEntry());
            });
          });
        });

        zip.readEntry();
      });
    });

    const newUsage = process.memoryUsage();
    const added = Math.round((newUsage.heapUsed - prevUsage.heapUsed) / 1024 / 1024 * 100) / 100;
    log(`fully cached ${this.cache.size} pages (${added >= 0 ? '+' : ''}${added} MB, now using ${Math.round(newUsage.heapUsed / 1024 / 1024)} MB total)`);
  }

  private async processFile(path: string, rawPage: string) {
    // remove any .md from the end of the path
    if (path.endsWith('.md')) {
      path = path.substring(0, path.length - 3);
    }

    const rawMatter = matter(rawPage);
    const meta = Object.assign(rawMatter.data, {
      canonicalName: path
    }) as PageMeta;

    const page: Page = {
      meta,
      text: rawMatter.content,
    };

    // if the parent exists, add the new child to it
    if (path.includes('/')) {
      const splitPath = path.split('/');
      const hierarchy = splitPath.slice(0, splitPath[splitPath.length - 1] === 'index' ? -2 : -1);
      hierarchy.push('index');
      const parentPath = hierarchy.join('/');
      const parent = this.cache.get(parentPath);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }

        parent.children.push(page.meta);
        this.cache.set(parentPath, parent);
      }
    }

    // if this new page is the parent of already existing children, add them to the new page as children
    // iterate through the cache and find all paths that start with this path
    for (const [key, value] of this.cache) {
      if (key.startsWith(`${path}/`)) {
        if (!page.children) {
          page.children = [];
        }

        page.children.push(value.meta);
      }
    }

    // finally, set the page free into the cache
    this.cache.set(path, page);
  }

  async get(pagePath: string): Promise<Page | null> {
    if (pagePath.endsWith('.md')) {
      pagePath = pagePath.substring(0, pagePath.length - 3);
    }

    if (pagePath === '') {
      pagePath = 'index';
    }

    let page = this.cache.get(pagePath);
    if (!page) {
      page = this.cache.get(pagePath + (pagePath.endsWith('/') ? '' : '/') + 'index');
    }

    log(`get: ${pagePath} = ${page ? 'found' : 'not found'}`);
    return page ?? null;
  }

  async search(query: string): Promise<PageMeta[]> {
    if (query.length < 3) {
      const e = new Error('search query must be at least 3 characters long');
      // @ts-ignore - this is criminal but I'm feeling lazy
      e.statusCode = 400;
      throw e;
    }

    const results: PageMeta[] = [];

    for (const [key, value] of this.cache) {
      if (key.includes(query)
        || value.meta.name?.includes(query)
        || value.meta.description?.includes(query)
        || value.text.includes(query)) {
        results.push(value.meta);
      }
    }

    log(`search: ${query} = ${results.length} results`);
    return results;
  }
}
