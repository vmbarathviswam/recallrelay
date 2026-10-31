import { createHandler } from '../src/http.mjs';
import assets from '../.generated/assets.mjs';
export default { fetch: createHandler({ assets }) };
