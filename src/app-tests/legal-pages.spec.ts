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
  assert.match(privacy, /最終更新日：2026年9月7日/);
  assert.match(privacy, /端末内に保存/);
  assert.match(privacy, /PostHog US\s+Cloud/);
  assert.match(privacy, /RevenueCat/);
  assert.match(privacy, /マイクとモーション/);
  assert.match(privacy, /音声認識は端末内/);
  assert.match(privacy, /音声、録音、モーション値は保存、分析、外部送信しません/);
  assert.doesNotMatch(privacy, /近接センサー|近接情報/);
  assert.match(privacy, /タイトルと日時の候補/);
  assert.match(privacy, /AndroidとiOSの間で購入権利は共有されません/);
  assert.match(privacy, /href="\.\.\/terms\/"/);
});

test('published terms document the lifetime Pro purchase contract', () => {
  const terms = readLegalPage('docs/terms/index.html');

  assert.match(terms, /<meta name="viewport"/);
  assert.match(terms, /利用規約/);
  assert.match(terms, /最終更新日：2026年9月7日/);
  assert.match(terms, /同時に6件まで/);
  assert.match(terms, /買い切り商品/);
  assert.match(terms, /忘れたくないことを無制限に追加できる/);
  assert.doesNotMatch(terms, /アクティブなリマインダー件数を無制限/);
  assert.match(terms, /自動更新はありません/);
  assert.match(terms, /同じストアアカウントで復元/);
  assert.match(terms, /返金や取消/);
  assert.match(
    terms,
    /OSのバックアップ設定によっては端末バックアップの対象となり、復元される場合があります/,
  );
  assert.match(terms, /href="\.\.\/privacy\/"/);
});

test('privacy disclosures cover OS surfaces, voice preparation, and purchase startup traffic', () => {
  for (const path of [
    'docs/privacy/index.html',
    'docs/PRIVACY_POLICY.md',
    'src/features/settings/screens/SettingsScreen.tsx',
  ]) {
    const privacy = readLegalPage(path);
    for (const disclosure of [
      /ロック画面/,
      /Widget/,
      /タイトルと日時の候補/,
      /認識用モデルのダウンロード/,
      /イベントの発生時刻/,
      /購入前でもアプリ起動時/,
      /分析への同意とは別/,
      /IPアドレス/,
      /HTTPS/,
      /Rion（個人開発）/,
      /rion\.developer\.apps@gmail\.com/,
      /同意の撤回だけでは収集済みイベントは削除されません/,
      /https:\/\/posthog.com\/privacy/,
      /https:\/\/www.revenuecat.com\/privacy/,
      /https:\/\/policies.google.com\/privacy/,
      /https:\/\/www.apple.com\/legal\/privacy\/jp\//,
    ]) {
      assert.match(privacy, disclosure, `${path}: ${disclosure}`);
    }
    assert.doesNotMatch(
      privacy,
      /文字起こしは追加画面のタイトル欄にだけ|文字起こしは追加画面にだけ/,
    );
  }
});

test('web and in-app terms explain voice confirmation, expired data, and statutory liability', () => {
  for (const path of [
    'docs/terms/index.html',
    'src/features/settings/screens/SettingsScreen.tsx',
  ]) {
    const terms = readLegalPage(path);
    assert.match(terms, /認識結果と日時を確認/);
    assert.match(terms, /自動整理は初期状態でON/);
    assert.match(terms, /6件を超えて登録済みのデータを削除・非表示にはしません/);
    assert.match(terms, /消費者契約法/);
    assert.match(terms, /日本法に準拠/);
    assert.match(terms, /Rion（個人開発）/);
    assert.match(terms, /rion\.developer\.apps@gmail\.com/);
    assert.doesNotMatch(terms, /学生の個人開発者/);
  }
});
