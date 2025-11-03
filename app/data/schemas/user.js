import { withDefaults } from '@warp-drive/core/reactive';

export const userSchema = withDefaults({
  type: 'user',
  fields: [
    { kind: 'field', name: 'username' },
    { kind: 'field', name: 'bio' },
    { kind: 'field', name: 'image' },
    { kind: 'field', name: 'following' },
  ],
});
