import { withDefaults } from '@warp-drive/core/reactive';

export const profileSchema = withDefaults({
  type: 'profile',
  fields: [
    { kind: 'field', name: 'username' },
    { kind: 'field', name: 'bio' },
    { kind: 'field', name: 'image' },
    { kind: 'field', name: 'following' },
  ],
});
