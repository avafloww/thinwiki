process.env.DEBUG = 'wiki,wiki:*';

import 'dotenv/config';
import ThinWiki from './main';

ThinWiki.bootstrap();
