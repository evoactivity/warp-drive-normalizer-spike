import { withDefaults } from '@warp-drive/core/reactive';

export const articleSchema = withDefaults({
  type: 'article',
  fields: [
    { kind: 'field', name: 'body' },
    { kind: 'field', name: 'description' },
    { kind: 'field', name: 'favorited' },
    { kind: 'field', name: 'favoritesCount' },
    { kind: 'field', name: 'slug' },
    { kind: 'field', name: 'title' },
    { kind: 'field', name: 'tagList' },
    {
      kind: 'belongsTo',
      name: 'author',
      type: 'user',
      options: {
        async: false,
        inverse: null,
        polymorphic: false,
        linksMode: true,
      },
    },
    { kind: 'field', name: 'updatedAt' },
    { kind: 'field', name: 'createdAt' },
  ],
});
