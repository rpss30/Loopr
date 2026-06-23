import 'dotenv/config';

import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Loopr API listening on port ${env.PORT}`);
});
