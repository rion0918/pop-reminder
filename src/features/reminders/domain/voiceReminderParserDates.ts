import type { DateParseContext, TemporalCandidate } from './voiceReminderParserTypes';
import { parseNumericText } from './voiceReminderParserText';

const WEEKDAY_NAMES = ['日曜', '月曜', '火曜', '水曜', '木曜', '金曜', '土曜'] as const;
const WEEKDAY_PATTERN = '(日曜|月曜|火曜|水曜|木曜|金曜|土曜)(?:日)?';

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function makeDate(year: number, month: number, day: number) {
  const result = new Date(2000, 0, 1);
  result.setHours(0, 0, 0, 0);
  result.setFullYear(year, month - 1, day);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result;
}

function formatDate(value: Date) {
  return `${value.getFullYear().toString().padStart(4, '0')}-${(value.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getDate().toString().padStart(2, '0')}`;
}

function dateCandidate(
  match: RegExpExecArray,
  value: Date | null,
  status: 'valid' | 'ambiguous' | 'invalid',
  kind: TemporalCandidate['kind'] = 'date',
): TemporalCandidate {
  return {
    field: 'date',
    start: match.index,
    end: match.index + match[0].length,
    sourceText: match[0],
    status,
    value: value ? formatDate(value) : null,
    kind,
    rolloverDate: false,
    relativeDateTime: false,
    pairedDateValue: null,
  };
}

function validDateCandidate(match: RegExpExecArray, value: Date) {
  return dateCandidate(match, value, 'valid');
}

function resolveOmittedMonthDay(month: number, day: number, currentDateTime: Date) {
  const today = startOfDay(currentDateTime);
  if (month < 1 || month > 12) return null;
  for (let yearOffset = 0; yearOffset < 12; yearOffset += 1) {
    const candidate = makeDate(today.getFullYear() + yearOffset, month, day);
    if (candidate && candidate >= today) return candidate;
  }
  return null;
}

function resolveOmittedDay(day: number, currentDateTime: Date) {
  const today = startOfDay(currentDateTime);
  for (let monthOffset = 0; monthOffset < 12; monthOffset += 1) {
    const candidateMonth = new Date(today);
    candidateMonth.setDate(1);
    candidateMonth.setMonth(candidateMonth.getMonth() + monthOffset);
    const candidate = makeDate(candidateMonth.getFullYear(), candidateMonth.getMonth() + 1, day);
    if (candidate && candidate >= today) return candidate;
  }
  return null;
}

function resolveMonthOffset(monthOffset: number, day: number, currentDateTime: Date) {
  const today = startOfDay(currentDateTime);
  const firstOfTargetMonth = new Date(today);
  firstOfTargetMonth.setDate(1);
  firstOfTargetMonth.setMonth(firstOfTargetMonth.getMonth() + monthOffset);
  return makeDate(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + 1, day);
}

function resolveMonthEnd(year: number, month: number) {
  return new Date(year, month, 0);
}

function resolveWeekday(weekday: number, currentDateTime: Date, mode: string | undefined) {
  const today = startOfDay(currentDateTime);
  const currentWeekday = today.getDay();
  if (mode === '来週' || mode === '再来週' || mode === '今週') {
    const mondayOffset = (currentWeekday + 6) % 7;
    const weekOffset = mode === '来週' ? 7 : mode === '再来週' ? 14 : 0;
    const weekdayOffset = weekday === 0 ? 6 : weekday - 1;
    const candidate = addDays(today, -mondayOffset + weekOffset + weekdayOffset);
    return mode === '今週' && candidate < today ? addDays(candidate, 7) : candidate;
  }

  let delta = (weekday - currentWeekday + 7) % 7;
  if (mode === '次の' && delta === 0) delta = 7;
  return addDays(today, delta);
}

function weekdayNumber(value: string) {
  const index = WEEKDAY_NAMES.findIndex((name) => value.startsWith(name));
  return index;
}

export function findDateCandidates(text: string, { currentDateTime }: DateParseContext) {
  const candidates: TemporalCandidate[] = [];

  const overlaps = (start: number, end: number) =>
    candidates.some((candidate) => start < candidate.end && end > candidate.start);

  function addMatches(regex: RegExp, resolve: (match: RegExpExecArray) => TemporalCandidate) {
    for (const match of text.matchAll(regex)) {
      const execMatch = match as RegExpExecArray;
      if (!overlaps(execMatch.index, execMatch.index + execMatch[0].length)) {
        candidates.push(resolve(execMatch));
      }
    }
  }

  addMatches(
    new RegExp(`((?:再来週|来週|今週|次の)\\s*(?:の\\s*)?${WEEKDAY_PATTERN})`, 'g'),
    (match) => {
      const weekdayText = match[1].match(new RegExp(WEEKDAY_PATTERN));
      const mode = match[1].match(/^(再来週|来週|今週|次の)/)?.[1];
      const weekday = weekdayText ? weekdayNumber(weekdayText[1]) : -1;
      return validDateCandidate(match, resolveWeekday(weekday, currentDateTime, mode));
    },
  );

  addMatches(/((?:再来月|来月)\s*(?:の\s*)?\d{1,2}日)/g, (match) => {
    const day = parseNumericText(match[1].match(/\d{1,2}(?=日)/)?.[0] ?? '');
    const value =
      day === null
        ? null
        : resolveMonthOffset(match[1].startsWith('再来月') ? 2 : 1, day, currentDateTime);
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(/(今月\s*(?:の\s*)?\d{1,2}日)/g, (match) => {
    const day = Number(match[1].match(/\d{1,2}(?=日)/)?.[0]);
    const value = resolveMonthOffset(0, day, currentDateTime);
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(
    /((?:再来月|来月|今月)\s*(?:の\s*)?(?:末|最後の日)|\d{1,2}月\s*(?:末|最後の日)|月末)/g,
    (match) => {
      const today = startOfDay(currentDateTime);
      const monthText = match[0].match(/\d{1,2}(?=月)/)?.[0];
      const month = monthText ? Number(monthText) : null;
      let targetMonth = today.getMonth() + 1;
      let targetYear = today.getFullYear();
      if (match[0].startsWith('来月')) targetMonth += 1;
      if (match[0].startsWith('再来月')) targetMonth += 2;
      if (month !== null) {
        targetMonth = month;
        if (targetMonth < 1 || targetMonth > 12) {
          return dateCandidate(match, null, 'invalid');
        }
        const thisYearValue = resolveMonthEnd(targetYear, targetMonth);
        if (thisYearValue < today) targetYear += 1;
      }
      const value = resolveMonthEnd(targetYear, targetMonth);
      return validDateCandidate(match, value);
    },
  );

  addMatches(/(\d+)\s*(週間?)\s*(後|前)/g, (match) => {
    const amount = Number(match[1]);
    const value = addDays(currentDateTime, amount * 7 * (match[3] === '前' ? -1 : 1));
    return validDateCandidate(match, value);
  });

  addMatches(/(\d+)\s*日\s*(後|前)/g, (match) => {
    const amount = Number(match[1]);
    const value = addDays(currentDateTime, amount * (match[2] === '前' ? -1 : 1));
    return validDateCandidate(match, value);
  });

  addMatches(/(今日|きょう|明日|あした|明後日|あさって|昨日|きのう)/g, (match) => {
    const offsets: Record<string, number> = {
      今日: 0,
      きょう: 0,
      明日: 1,
      あした: 1,
      明後日: 2,
      あさって: 2,
      昨日: -1,
      きのう: -1,
    };
    return validDateCandidate(match, addDays(startOfDay(currentDateTime), offsets[match[1]]));
  });

  addMatches(new RegExp(`(${WEEKDAY_PATTERN})`, 'g'), (match) =>
    validDateCandidate(match, resolveWeekday(weekdayNumber(match[1]), currentDateTime, undefined)),
  );

  addMatches(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g, (match) => {
    const value = makeDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(/(\d{1,2})月\s*(\d{1,2})日/g, (match) => {
    const value = resolveOmittedMonthDay(Number(match[1]), Number(match[2]), currentDateTime);
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(/(\d{1,2})\s*\/\s*(\d{1,2})/g, (match) => {
    const value = resolveOmittedMonthDay(Number(match[1]), Number(match[2]), currentDateTime);
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(/(\d{1,2})日/g, (match) => {
    const value = resolveOmittedDay(Number(match[1]), currentDateTime);
    return dateCandidate(match, value, value ? 'valid' : 'invalid');
  });

  addMatches(
    /(今週末|来週末|来月初め|再来月初め|再来週|来週|今週|再来月|来月|今月|先週|週末|月初め|月初|上旬|中旬|下旬|\d{1,2}月\s*(?:上旬|中旬|下旬))/g,
    (match) => dateCandidate(match, null, 'ambiguous'),
  );

  return candidates.sort((first, second) => first.start - second.start);
}
