import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const reviewWorkflow = readFileSync(
  resolve(repositoryRoot, '.github/workflows/codex-pr-review.yml'),
  'utf8',
);
const codexReviewGuidelines = readFileSync(
  resolve(repositoryRoot, '.codex/skills/pr-review.md'),
  'utf8',
);
const antigravityReviewSkill = readFileSync(
  resolve(repositoryRoot, '.agents/skills/pr-review/SKILL.md'),
  'utf8',
);

test('codex-pr-review workflow triggers on pull request events and ignores drafts', () => {
  assert.match(reviewWorkflow, /on:\s*\n\s*pull_request:/);
  assert.match(reviewWorkflow, /types:\s*\[opened,\s*synchronize\]/);
  assert.match(reviewWorkflow, /if:\s*github\.event\.pull_request\.draft == false/);
});

test('codex-pr-review workflow configures proper write permissions and actions', () => {
  assert.match(reviewWorkflow, /contents:\s*write/);
  assert.match(reviewWorkflow, /pull-requests:\s*write/);
  assert.match(reviewWorkflow, /uses:\s*openai\/codex-action@v1/);
});

test('codex-pr-review workflow auto-merges size/XS and approved PRs', () => {
  assert.match(reviewWorkflow, /any\(\. == "size\/XS"\)/);
  assert.match(reviewWorkflow, /select\(\.state == "APPROVED"\)/);
  assert.match(reviewWorkflow, /gh pr merge "\$PR_NUMBER" --auto --squash/);
});

test('codex and antigravity pr-review guidelines cover size matrix from size/XS through size/XL', () => {
  for (const skillContent of [codexReviewGuidelines, antigravityReviewSkill]) {
    assert.match(skillContent, /`size\/XS`/);
    assert.match(skillContent, /`size\/S`/);
    assert.match(skillContent, /`size\/M`/);
    assert.match(skillContent, /`size\/L`/);
    assert.match(skillContent, /`size\/XL`/);
    assert.match(skillContent, /Code Review & Approval Criteria/);
  }
});
