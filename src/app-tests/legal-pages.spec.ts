import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function readLegalPage(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8');
}

test('GitHub Pages entry point links to the app legal documents', () => {
  const index = readLegalPage('docs/index.html');

  assert.match(index, /<meta name="viewport"/);
  assert.match(index, /ふわっと。/);
  assert.match(index, /href="\.\/terms\/"/);
  assert.match(index, /href="\.\/privacy\/"/);
});

test('published privacy policy documents local data, analytics, and purchases', () => {
  const privacy = readLegalPage('docs/privacy/index.html');

  assert.match(privacy, /<meta name="viewport"/);
  assert.match(privacy, /プライバシーポリシー/);
  assert.match(privacy, /最終更新日：2026年8月9日/);
  assert.match(privacy, /端末内に保存/);
  assert.match(privacy, /PostHog US\s+Cloud/);
  assert.match(privacy, /RevenueCat/);
  assert.match(privacy, /AndroidとiOSの間で購入権利は共有されません/);
  assert.match(privacy, /href="\.\.\/terms\/"/);
});

test('published terms document the lifetime Pro purchase contract', () => {
  const terms = readLegalPage('docs/terms/index.html');

  assert.match(terms, /<meta name="viewport"/);
  assert.match(terms, /利用規約/);
  assert.match(terms, /最終更新日：2026年8月9日/);
  assert.match(terms, /同時に6件まで/);
  assert.match(terms, /買い切り商品/);
  assert.match(terms, /忘れたくないことを無制限に追加できる/);
  assert.doesNotMatch(terms, /アクティブなリマインダー件数を無制限/);
  assert.match(terms, /自動更新はありません/);
  assert.match(terms, /同じストアアカウントで復元/);
  assert.match(terms, /返金や取消/);
  assert.match(terms, /href="\.\.\/privacy\/"/);
});
