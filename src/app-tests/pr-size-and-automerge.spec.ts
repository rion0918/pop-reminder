import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sizeWorkflow = readFileSync(
  resolve(repositoryRoot, '.github/workflows/pr-size-and-automerge.yml'),
  'utf8',
);
const codeRabbitConfig = readFileSync(resolve(repositoryRoot, '.coderabbit.yaml'), 'utf8');
const antigravitySkill = readFileSync(
  resolve(repositoryRoot, '.agents/skills/pr-review/SKILL.md'),
  'utf8',
);

test('pr-size-and-automerge workflow triggers on PR events and PR review events', () => {
  assert.match(sizeWorkflow, /pull_request:/);
  assert.match(
    sizeWorkflow,
    /types:\s*\[opened,\s*synchronize,\s*reopened,\s*labeled,\s*unlabeled\]/,
  );
  assert.match(sizeWorkflow, /pull_request_review:/);
  assert.match(sizeWorkflow, /types:\s*\[submitted,\s*dismissed\]/);
  assert.match(sizeWorkflow, /if:\s*github\.event\.pull_request\.draft == false/);
});

test('pr-size-and-automerge workflow classifies size/XS for non-prod code and requires APPROVED reviewDecision', () => {
  assert.match(sizeWorkflow, /IS_PROD_CODE=/);
  assert.match(sizeWorkflow, /src\/features\/reminders\/domain\//);
  assert.match(sizeWorkflow, /src\/bootstrap\//);
  assert.match(sizeWorkflow, /\[ "\$IS_PROD_CODE" = "false" \]/);
  assert.match(sizeWorkflow, /REVIEW_DECISION=/);
  assert.match(sizeWorkflow, /\[ "\$REVIEW_DECISION" = "APPROVED" \]/);
  assert.match(sizeWorkflow, /SIZE_LABEL="size\/XS"/);
  assert.match(sizeWorkflow, /gh pr merge "\$PR_NUMBER" --auto --squash/);
});

test('coderabbit configuration enables Japanese auto review', () => {
  assert.match(codeRabbitConfig, /language:\s*['"]ja-JP['"]/);
  assert.match(codeRabbitConfig, /auto_review:/);
  assert.match(codeRabbitConfig, /enabled:\s*true/);
});

test('antigravity pr-review skill covers size matrix from size/XS through size/XL', () => {
  assert.match(antigravitySkill, /`size\/XS`/);
  assert.match(antigravitySkill, /`size\/S`/);
  assert.match(antigravitySkill, /`size\/M`/);
  assert.match(antigravitySkill, /`size\/L`/);
  assert.match(antigravitySkill, /`size\/XL`/);
  assert.match(antigravitySkill, /Code Review & Approval Criteria/);
});
