import { useRecommendedStore } from '@warp-drive/core';
import { JSONAPICache } from '@warp-drive/json-api';
import { articleSchema } from '../data/schemas/article.js';
import { userSchema } from '../data/schemas/user.js';
import { normalize } from '../data/handlers/normalize.js';
import { tagSchema } from '../data/schemas/tag.js';
import { profileSchema } from '../data/schemas/profile.js';

const Store = useRecommendedStore({
  cache: JSONAPICache,
  handlers: [normalize],
  schemas: [articleSchema, userSchema, profileSchema, tagSchema],
});

export default Store;
