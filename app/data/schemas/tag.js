import { withDefaults } from '@warp-drive/core/reactive';

export const tagSchema = withDefaults({
  type: 'tag',
  fields: [{ kind: 'field', name: 'name' }],
});
