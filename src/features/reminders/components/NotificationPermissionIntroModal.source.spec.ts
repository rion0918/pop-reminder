import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './NotificationPermissionIntroModal.tsx');

test('notification guidance sits below the permission choices', () => {
  const actionsIndex = source.indexOf('<View style={styles.actions}>');
  const noteIndex = source.indexOf('<View style={styles.note}>');

  assert.equal(actionsIndex >= 0, true);
  assert.equal(noteIndex > actionsIndex, true);
  assertSourceIncludes(source, [
    /通知は端末の設定からいつでも変更できます/,
    /note:\s*\{[\s\S]*backgroundColor: '#EFFAF5'/,
  ]);
});
