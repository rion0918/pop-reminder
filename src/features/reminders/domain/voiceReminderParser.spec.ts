import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseVoiceReminder, type ParsedReminder } from './voiceReminderParser';

const currentDateTime = new Date(2026, 8, 20, 15, 40, 0, 0);

function parse(text: string, overrides: Partial<Parameters<typeof parseVoiceReminder>[0]> = {}) {
  return parseVoiceReminder({
    text,
    currentDateTime,
    currentUiDate: '2026-09-20',
    currentUiTime: '08:00',
    ...overrides,
  });
}

function expectFields(
  result: ParsedReminder,
  fields: {
    title: string;
    date: string | null;
    dateStatus: ParsedReminder['date']['status'];
    time: string | null;
    timeStatus: ParsedReminder['time']['status'];
  },
) {
  assert.equal(result.title.value, fields.title);
  assert.equal(result.date.value, fields.date);
  assert.equal(result.date.status, fields.dateStatus);
  assert.equal(result.time.value, fields.time);
  assert.equal(result.time.status, fields.timeStatus);
}

test('parses a concrete relative date and time and removes them from the title', () => {
  const result = parse('明日の15時に田中さんに電話');

  expectFields(result, {
    title: '田中さんに電話',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: '15:00',
    timeStatus: 'parsed',
  });
  assert.equal(result.date.sourceText, '明日');
  assert.equal(result.time.sourceText, '15時');
});

test('keeps both UI schedule fields when no date or time is spoken', () => {
  const result = parse('牛乳買う');

  expectFields(result, {
    title: '牛乳買う',
    date: null,
    dateStatus: 'unchanged',
    time: null,
    timeStatus: 'unchanged',
  });
});

test('updates only the spoken date', () => {
  const result = parse('明日に牛乳買う');

  expectFields(result, {
    title: '牛乳買う',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: null,
    timeStatus: 'unchanged',
  });
});

test('updates only the spoken time and resolves night hours', () => {
  const result = parse('夜8時に薬');

  expectFields(result, {
    title: '薬',
    date: null,
    dateStatus: 'unchanged',
    time: '20:00',
    timeStatus: 'parsed',
  });
});

test('resolves relative minutes against one fixed current date-time and crosses midnight', () => {
  const result = parse('30分後くらいに洗濯物取り込む', {
    currentDateTime: new Date(2026, 8, 20, 23, 40),
    currentUiDate: '2026-09-20',
    currentUiTime: '08:00',
  });

  expectFields(result, {
    title: '洗濯物取り込む',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: '00:10',
    timeStatus: 'parsed',
  });
  assert.equal(result.relativeDateTime.detected, true);
  assert.equal(result.relativeDateTime.sourceText, '30分後くらい');
});

test('uses a corrected time without treating the earlier time as a conflict', () => {
  const result = parse('明日の3時、いや4時に電話');

  expectFields(result, {
    title: '電話',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: '04:00',
    timeStatus: 'parsed',
  });
  assert.equal(result.internalFlags.multipleTimeCandidates, false);
  assert.equal(result.corrections[0]?.detected, true);
  assert.equal(result.corrections[0]?.before, '3時');
  assert.equal(result.corrections[0]?.after, '4時');
});

test('removes a leading correction marker when it introduces the only date candidate', () => {
  const result = parse('いや、明日に電話');

  assert.equal(result.title.value, '電話');
  assert.equal(result.date.value, '2026-09-21');
  assert.equal(result.corrections[0]?.before, null);
  assert.equal(result.corrections[0]?.after, '明日');
});

test('marks multiple uncorrected times as ambiguous and preserves the title', () => {
  const result = parse('明日の10時と15時に薬');

  expectFields(result, {
    title: '薬',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: null,
    timeStatus: 'ambiguous',
  });
  assert.equal(result.internalFlags.multipleTimeCandidates, true);
  const mixed = parse('夜と10時に薬');
  assert.equal(mixed.time.value, null);
  assert.equal(mixed.time.status, 'ambiguous');
});

test('does not resolve a week without a weekday', () => {
  const result = parse('来週に田中さんへ電話');
  const currentWeek = parse('今週に会議');
  const currentMonth = parse('今月に支払い');
  const weekend = parse('来週末に休む');
  const monthStart = parse('来月初めに旅行');

  expectFields(result, {
    title: '田中さんへ電話',
    date: null,
    dateStatus: 'ambiguous',
    time: null,
    timeStatus: 'unchanged',
  });
  assert.equal(currentWeek.date.status, 'ambiguous');
  assert.equal(currentWeek.title.value, '会議');
  assert.equal(currentMonth.date.status, 'ambiguous');
  assert.equal(currentMonth.title.value, '支払い');
  assert.equal(weekend.date.status, 'ambiguous');
  assert.equal(weekend.date.sourceText, '来週末');
  assert.equal(weekend.title.value, '休む');
  assert.equal(monthStart.date.status, 'ambiguous');
  assert.equal(monthStart.date.sourceText, '来月初め');
  assert.equal(monthStart.title.value, '旅行');
});

test('resolves the next occurrence of a weekday, including the current weekday', () => {
  const today = parse('土曜日に病院');
  const currentWeekPassed = parse('今週月曜に会議');
  const sameWeekday = parse('日曜日に休む', {
    currentDateTime: new Date(2026, 8, 20, 15, 40),
    currentUiDate: '2026-09-20',
  });

  assert.equal(today.date.value, '2026-09-26');
  assert.equal(today.date.status, 'parsed');
  assert.equal(currentWeekPassed.date.value, '2026-09-21');
  assert.equal(currentWeekPassed.date.status, 'parsed');
  assert.equal(sameWeekday.date.value, '2026-09-20');
  assert.equal(sameWeekday.date.status, 'parsed');
});

test('uses next week and next month calendar rules', () => {
  const nextWeek = parse('来週月曜日に会議');
  const nextMonth = parse('来月10日に提出');
  const currentMonth = parse('今月10日に提出');

  assert.equal(nextWeek.date.value, '2026-09-21');
  assert.equal(nextWeek.date.status, 'parsed');
  assert.equal(nextMonth.date.value, '2026-10-10');
  assert.equal(nextMonth.date.status, 'parsed');
  assert.equal(currentMonth.date.value, '2026-09-10');
  assert.equal(currentMonth.date.status, 'parsed');
});

test('uses future completion for omitted month and rolls a past day into the next month', () => {
  const result = parse('10日に支払い');
  const skipsShortMonth = parse('31日に支払い', {
    currentDateTime: new Date(2026, 1, 20, 9, 0),
    currentUiDate: '2026-02-20',
  });

  assert.equal(result.date.value, '2026-10-10');
  assert.equal(result.date.status, 'parsed');
  assert.equal(skipsShortMonth.date.value, '2026-03-31');
  assert.equal(skipsShortMonth.date.status, 'parsed');
});

test('supports leap-year month end and reports impossible dates as invalid', () => {
  const leap = parse('2月末に確認', {
    currentDateTime: new Date(2028, 0, 10, 9, 0),
    currentUiDate: '2028-01-10',
  });
  const invalid = parse('9月31日に確認');
  const nextLeapDay = parse('2月29日に確認', {
    currentDateTime: new Date(2026, 0, 10, 9, 0),
    currentUiDate: '2026-01-10',
  });

  assert.equal(leap.date.value, '2028-02-29');
  assert.equal(leap.date.status, 'parsed');
  assert.equal(invalid.date.value, null);
  assert.equal(invalid.date.status, 'invalid');
  assert.equal(invalid.internalFlags.invalidDateDetected, true);
  assert.equal(nextLeapDay.date.value, '2028-02-29');
  assert.equal(nextLeapDay.date.status, 'parsed');
  assert.equal(
    parse('2月最後の日に確認', { currentDateTime: new Date(2028, 0, 10) }).date.value,
    '2028-02-29',
  );
});

test('keeps explicit years even when they are in the past', () => {
  const result = parse('2025年1月5日に確定申告');

  assert.equal(result.date.value, '2025-01-05');
  assert.equal(result.date.status, 'parsed');
});

test('normalizes full-width and kanji numbers only in date-time contexts', () => {
  const result = parse('第一生命に電話、明後日の三時');
  const positionalKanji = parse('二〇二六年九月二十一日に確認');

  assert.match(result.normalizedText, /第一生命/);
  assert.match(result.normalizedText, /明後日の3時/);
  assert.equal(result.date.value, '2026-09-22');
  assert.equal(result.time.value, '03:00');
  assert.equal(positionalKanji.date.value, '2026-09-21');
});

test('handles explicit 24:00 as the following day', () => {
  const result = parse('24時に薬');

  expectFields(result, {
    title: '薬',
    date: '2026-09-21',
    dateStatus: 'parsed',
    time: '00:00',
    timeStatus: 'parsed',
  });
});

test('supports minutes, half-hours, colon notation, and noon', () => {
  assert.equal(parse('午前3時半に薬').time.value, '03:30');
  assert.equal(parse('午後3時15分に電話').time.value, '15:15');
  assert.equal(parse('10:05に出発').time.value, '10:05');
  assert.equal(parse('正午に昼食').time.value, '12:00');
  assert.equal(parse('午後24時に薬').time.status, 'invalid');
});

test('parses a precise past relative expression without future correction', () => {
  const result = parse('30分前に確認');

  assert.equal(result.date.value, '2026-09-20');
  assert.equal(result.time.value, '15:10');
  assert.equal(result.date.status, 'parsed');
  assert.equal(result.time.status, 'parsed');
});

test('accepts the short after-duration form', () => {
  const result = parse('あと30分ぐらいに確認');
  const spacedHalf = parse('1時間 半後に確認');
  const spacedNatural = parse('30分 したら確認');

  assert.equal(result.date.value, '2026-09-20');
  assert.equal(result.time.value, '16:10');
  assert.equal(result.relativeDateTime.detected, true);
  assert.equal(spacedHalf.time.value, '17:10');
  assert.equal(spacedNatural.time.value, '16:10');
});

test('cleans fillers and request wording without inventing a title', () => {
  const result = parse('えっと、明日の10時にですね、牛乳を買ってくるのをリマインドしてください');
  const empty = parse('明日の10時にリマインドして');
  const contentWord = parse('15時に通知機能について田中さんに電話');

  assert.equal(result.title.value, '牛乳を買ってくる');
  assert.equal(result.title.status, 'parsed');
  assert.equal(empty.title.value, '');
  assert.equal(empty.title.status, 'empty');
  assert.equal(contentWord.title.value, '通知機能について田中さんに電話');
  assert.equal(parse('えっと明日10時に電話').title.value, '電話');
  assert.equal(parse('明日10時にリマインドして田中に電話').title.value, '田中に電話');
  assert.equal(parse('夜の薬').title.value, '薬');
});

test('removes polite suffixes from operation requests at sentence boundaries', () => {
  assert.equal(parse('明日10時にリマインダーを入れてください').title.value, '');
  assert.equal(parse('明日10時にリマインダーを追加してください').title.value, '');
  assert.equal(parse('明日10時にセットしてください').title.value, '');
  assert.equal(parse('明日10時に牛乳を買うのをお願いします').title.value, '牛乳を買う');
});

test('does not let an uncorrected invalid candidate get overridden by a valid one', () => {
  const result = parse('9月31日と10月1日に確認');

  assert.equal(result.date.value, null);
  assert.equal(result.date.status, 'invalid');
  assert.equal(result.internalFlags.invalidDateDetected, true);
});
