import { normalizeResource } from '../normalizer';

export const normalize = {
  async request(context, next) {
    const { content, request } = await next(context.request);
    return normalizeResource(content, request, {
      author: 'user',
      comments: 'comment',
    });
  },
};
