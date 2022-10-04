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
    const rawMatter = matter(rawPage);
    const meta = rawMatter.data as PageMeta;

    this.cache.set(path, {
      meta,
      text: rawMatter.content,
    });
  }

  async get(pagePath: string): Promise<Page | null> {
    if (!pagePath.endsWith('.md')) {
      pagePath += '.md';
    }

    const page = this.cache.get(pagePath);
    log(`get: ${pagePath} = ${page ? 'found' : 'not found'}`);
    return page ?? null;
  }

  async search(query: string): Promise<Page[]> {
    return [];
  }
}
