import { Storage } from './page/storage';
import { WebServer } from './web/WebServer';

const log = require('debug')('wiki');

class ThinWiki {
  storage: Storage = new Storage();
  web: WebServer = new WebServer();

  async bootstrap() {
    if (!process.env.RELOAD_TOKEN || process.env.RELOAD_TOKEN === 'ChangeMeToSomethingRandomAndSecure!') {
      throw new Error('RELOAD_TOKEN is not set or is set to the default value');
    }

    log('loading storage');
    await this.storage.initialize();
    log('loaded storage');

    log('loading web server');
    await this.web.bootstrap();
  }
}

const wiki = new ThinWiki();
export default wiki;
