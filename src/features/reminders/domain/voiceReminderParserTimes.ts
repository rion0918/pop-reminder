import type { TemporalCandidate, TimeParseContext } from './voiceReminderParserTypes';

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function formatTime(value: Date) {
  return `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`;
}

function formatDate(value: Date) {
  return `${value.getFullYear().toString().padStart(4, '0')}-${(value.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getDate().toString().padStart(2, '0')}`;
}

function timeCandidate(
  match: RegExpExecArray,
  value: string | null,
  status: 'valid' | 'ambiguous' | 'invalid',
  options: Partial<Pick<TemporalCandidate, 'kind' | 'rolloverDate' | 'relativeDateTime'>> = {},
  pairedDateValue: string | null = null,
): TemporalCandidate {
  return {
    field: 'time',
    start: match.index,
    end: match.index + match[0].length,
    sourceText: match[0],
    value,
    status,
    kind: options.kind ?? 'time',
    rolloverDate: options.rolloverDate ?? false,
    relativeDateTime: options.relativeDateTime ?? false,
    pairedDateValue,
  };
}

function resolveClockTime(prefix: string | undefined, hour: number, minute: number) {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return { value: null, status: 'invalid' as const, rolloverDate: false };
  }
  if (hour === 24) {
    return {
      value: !prefix && minute === 0 ? '00:00' : null,
      status: !prefix && minute === 0 ? ('valid' as const) : ('invalid' as const),
      rolloverDate: !prefix && minute === 0,
    };
  }
  if (hour < 0 || hour > 23) {
    return { value: null, status: 'invalid' as const, rolloverDate: false };
  }

  const normalizedPrefix = prefix?.trim();
  let resolvedHour = hour;
  if (normalizedPrefix === '午前') {
    if (hour === 12) resolvedHour = 0;
    else if (hour >= 13) return { value: null, status: 'invalid' as const, rolloverDate: false };
  } else if (normalizedPrefix === '午後') {
    if (hour === 0) return { value: null, status: 'invalid' as const, rolloverDate: false };
    if (hour < 12) resolvedHour = hour + 12;
  } else if (normalizedPrefix === '朝') {
    if (hour >= 12) return { value: null, status: 'invalid' as const, rolloverDate: false };
  } else if (normalizedPrefix === '昼') {
    if (hour === 0) return { value: null, status: 'invalid' as const, rolloverDate: false };
    if (hour < 12) resolvedHour = hour + 12;
  } else if (normalizedPrefix === '夕方') {
    if (hour === 0 || hour === 12)
      return { value: null, status: 'invalid' as const, rolloverDate: false };
    if (hour < 12) resolvedHour = hour + 12;
  } else if (normalizedPrefix === '夜') {
    if (hour === 0 || hour === 12) resolvedHour = 0;
    else if (hour < 12) resolvedHour = hour + 12;
  } else if (normalizedPrefix === '深夜') {
    if (hour > 5) return { value: null, status: 'invalid' as const, rolloverDate: false };
  }

  return {
    value: `${resolvedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    status: 'valid' as const,
    rolloverDate: false,
  };
}

function parseDuration(value: string) {
  const compactValue = value.replace(/\s+/g, '');
  const hoursAndMinutes = compactValue.match(/^(\d+)時間(?:半|(\d+)分)?$/);
  if (hoursAndMinutes) {
    return (
      Number(hoursAndMinutes[1]) * 60 +
      (hoursAndMinutes[0].includes('半') ? 30 : Number(hoursAndMinutes[2] ?? 0))
    );
  }
  const minutes = compactValue.match(/^(\d+)分$/);
  return minutes ? Number(minutes[1]) : null;
}

export function findTimeCandidates(text: string, { currentDateTime }: TimeParseContext) {
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

  const relativePattern =
    /(?:あと\s*)?((?:\d+\s*時間(?:\s*半|\s*\d+\s*分)?|\d+\s*分))\s*(後|前)(?:\s*(?:くらい|ぐらい|頃|ごろ))?/g;
  addMatches(relativePattern, (match) => {
    const amount = parseDuration(match[1]);
    if (amount === null)
      return timeCandidate(match, null, 'invalid', { kind: 'datetime', relativeDateTime: true });
    const target = addMinutes(currentDateTime, amount * (match[2] === '前' ? -1 : 1));
    return timeCandidate(
      match,
      formatTime(target),
      'valid',
      { kind: 'datetime', relativeDateTime: true },
      formatDate(target),
    );
  });

  const naturalRelativePattern =
    /(?:あと\s*)?((?:\d+\s*時間(?:\s*半|\s*\d+\s*分)?|\d+\s*分))(?:\s*(?:くらい|ぐらい)\s*)?\s*したら/g;
  addMatches(naturalRelativePattern, (match) => {
    const amount = parseDuration(match[1]);
    if (amount === null)
      return timeCandidate(match, null, 'invalid', { kind: 'datetime', relativeDateTime: true });
    const target = addMinutes(currentDateTime, amount);
    return timeCandidate(
      match,
      formatTime(target),
      'valid',
      { kind: 'datetime', relativeDateTime: true },
      formatDate(target),
    );
  });

  const afterOnlyPattern =
    /あと\s*((?:\d+\s*時間(?:\s*半|\s*\d+\s*分)?|\d+\s*分))(?:\s*(?:くらい|ぐらい|頃|ごろ))?/g;
  addMatches(afterOnlyPattern, (match) => {
    const amount = parseDuration(match[1]);
    if (amount === null)
      return timeCandidate(match, null, 'invalid', { kind: 'datetime', relativeDateTime: true });
    const target = addMinutes(currentDateTime, amount);
    return timeCandidate(
      match,
      formatTime(target),
      'valid',
      { kind: 'datetime', relativeDateTime: true },
      formatDate(target),
    );
  });

  addMatches(/\b(\d{1,2}):(\d{2})(?:\s*(?:ちょうど|ジャスト|ごろ|頃|くらい|ぐらい))*/g, (match) => {
    const resolved = resolveClockTime(undefined, Number(match[1]), Number(match[2]));
    return timeCandidate(match, resolved.value, resolved.status, {
      rolloverDate: resolved.rolloverDate,
    });
  });

  addMatches(/正午/g, (match) => timeCandidate(match, '12:00', 'valid'));

  addMatches(
    /((?:(?:午前|午後|朝|昼|夕方|夜|深夜)\s*)?\d{1,2}時(?:\s*(?:(\d{1,2})分|(半)))?(?:\s*(?:ちょうど|ジャスト|ごろ|頃|くらい|ぐらい))*)/g,
    (match) => {
      const prefix = match[1].match(/^(午前|午後|朝|昼|夕方|夜|深夜)/)?.[1];
      const hour = Number(match[1].match(/\d{1,2}(?=時)/)?.[0]);
      const minute = match[2] ? Number(match[2]) : match[3] ? 30 : 0;
      const resolved = resolveClockTime(prefix, hour, minute);
      return timeCandidate(match, resolved.value, resolved.status, {
        rolloverDate: resolved.rolloverDate,
      });
    },
  );

  addMatches(
    /(朝|昼|夕方|夜|深夜)(?!\s*\d{1,2}時)(?=\s*(?:の|に|へ|から|まで|までに|ごろ|頃|くらい|ぐらい|と|または|[、,。]|$))/g,
    (match) => timeCandidate(match, null, 'ambiguous'),
  );

  return candidates.sort((first, second) => first.start - second.start);
}
