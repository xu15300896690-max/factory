import { createApp } from './app.js';
import { env } from './config.js';

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`[api] listening on http://0.0.0.0:${env.PORT}`);
  console.log(`[api] NODE_ENV=${env.NODE_ENV}`);
  console.log(`[api] WEB_ORIGIN=${env.WEB_ORIGIN}`);
});