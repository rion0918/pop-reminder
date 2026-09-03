import { findDateCandidates } from './voiceReminderParserDates';
import { normalizeVoiceReminderText } from './voiceReminderParserText';
import { findTimeCandidates } from './voiceReminderParserTimes';
import type {
  ParsedReminder,
  ReminderParserInput,
  TemporalCandidate,
} from './voiceReminderParserTypes';

export type {
  ParsedReminder,
  ParsedField,
  ParsedVoiceField,
  ParseStatus,
  ReminderParserInput,
  VoiceParseStatus,
} from './voiceReminderParserTypes';

const CORRECTION_PATTERN = /いや|じゃなくて|じゃなく|ではなく|違う|訂正|やっぱり|やっぱ/g;
const TEMPORAL_PLACEHOLDER = '\u0000';

function joinSourceText(candidates: TemporalCandidate[]) {
  return candidates.length > 0
    ? candidates.map((candidate) => candidate.sourceText).join(' / ')
    : null;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(2000, 0, 1);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

function addLocalDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function formatDate(value: Date) {
  return `${value.getFullYear().toString().padStart(4, '0')}-${(value.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getDate().toString().padStart(2, '0')}`;
}

function resolveCorrections(text: string, candidates: TemporalCandidate[]) {
  const superseded = new Set<TemporalCandidate>();
  const corrections: ParsedReminder['corrections'] = [];
  const correctionRanges: { start: number; end: number }[] = [];

  for (const marker of text.matchAll(CORRECTION_PATTERN)) {
    const markerStart = marker.index;
    const markerEnd = markerStart + marker[0].length;
    const nearestBefore = candidates
      .filter((candidate) => candidate.end <= markerStart)
      .sort((first, second) => second.end - first.end)[0];
    const afterCandidates = candidates
      .filter((candidate) => candidate.start >= markerEnd)
      .sort((first, second) => first.start - second.start);
    const after =
      afterCandidates.find((candidate) => candidate.field === nearestBefore?.field) ??
      afterCandidates[0];
    const correctedField = after?.field;
    const before = correctedField
      ? candidates
          .filter((candidate) => candidate.field === correctedField && candidate.end <= markerStart)
          .sort((first, second) => second.end - first.end)[0]
      : undefined;

    if (after && correctedField) {
      for (const candidate of candidates) {
        if (candidate.field === correctedField && candidate.end <= markerStart) {
          superseded.add(candidate);
        }
      }
      corrections.push({
        detected: true,
        before: before?.sourceText ?? null,
        after: after.sourceText,
      });
      correctionRanges.push({ start: markerStart, end: markerEnd });
    }
  }

  return { superseded, corrections, correctionRanges };
}

function resolveField(candidates: TemporalCandidate[], field: 'date' | 'time') {
  const fieldCandidates = candidates.filter((candidate) => candidate.field === field);
  if (fieldCandidates.length === 0) {
    return {
      value: null,
      status: 'unchanged' as const,
      sourceText: null,
      activeCandidates: [] as TemporalCandidate[],
    };
  }

  const activeCandidates = fieldCandidates.filter((candidate) => !candidate.superseded);
  const sourceText = joinSourceText(
    activeCandidates.length > 0 ? activeCandidates : fieldCandidates,
  );
  if (activeCandidates.length === 0) {
    return { value: null, status: 'unchanged' as const, sourceText, activeCandidates };
  }
  if (activeCandidates.some((candidate) => candidate.status === 'invalid')) {
    return { value: null, status: 'invalid' as const, sourceText, activeCandidates };
  }
  if (activeCandidates.some((candidate) => candidate.status === 'ambiguous')) {
    return { value: null, status: 'ambiguous' as const, sourceText, activeCandidates };
  }

  const values = new Set(activeCandidates.map((candidate) => candidate.value));
  if (values.size > 1) {
    return { value: null, status: 'ambiguous' as const, sourceText, activeCandidates };
  }
  return {
    value: activeCandidates[0].value,
    status: 'parsed' as const,
    sourceText,
    activeCandidates,
  };
}

function removeRanges(text: string, ranges: { start: number; end: number }[]) {
  let result = text;
  for (const range of [...ranges].sort((first, second) => second.start - first.start)) {
    result = result.slice(0, range.start) + TEMPORAL_PLACEHOLDER + result.slice(range.end);
  }
  return result;
}

const OPERATION_WORDS =
  '(?:リマインドして|リマインダー(?:を|に)?(?:入れて|追加して)|通知して|知らせて|覚えといて|覚えておいて|忘れないようにして|忘れないように通知して|アラームして|セットして)(?:ください|お願いします|お願いいたします)?';

function cleanTitle(
  text: string,
  candidates: TemporalCandidate[],
  correctionRanges: { start: number; end: number }[],
) {
  const temporalRanges = [
    ...new Map(
      candidates.map((candidate) => [
        `${candidate.start}:${candidate.end}`,
        { start: candidate.start, end: candidate.end },
      ]),
    ).values(),
  ];
  let result = removeRanges(text, [...temporalRanges, ...correctionRanges]);

  result = result.replace(
    new RegExp(`${TEMPORAL_PLACEHOLDER}\\s*(?:と|または)\\s*(?=${TEMPORAL_PLACEHOLDER})`, 'g'),
    TEMPORAL_PLACEHOLDER,
  );
  result = result.replace(
    new RegExp(
      `${TEMPORAL_PLACEHOLDER}\\s*(?:の|に|へ|は|が|を|から|までに|まで|ごろ|頃|くらい|ぐらい)?`,
      'g',
    ),
    ' ',
  );
  result = result.replace(
    new RegExp(`${TEMPORAL_PLACEHOLDER}\\s*(?:ですね|ですよね)\\s*[,、]?`, 'g'),
    ' ',
  );
  result = result.replace(new RegExp(`(?:の\\s*)?を\\s*(?=${OPERATION_WORDS})`, 'g'), '');
  result = result.replace(new RegExp(`(?:^|[、,])\\s*${OPERATION_WORDS}`, 'g'), ' ');
  result = result.replace(new RegExp(`\\s*${OPERATION_WORDS}\\s*$`, 'g'), ' ');

  result = result.replace(/(?:の\s*)?を\s*(?:お願いします|お願いいたします)\s*$/, ' ');

  const fillerPattern = new RegExp(
    `(?:^|[、,])\\s*(えっと|えーと|えーっと|あのー|うーん|んー|なんか|まあ|その|あの)(?=\\s|[、,。]|${TEMPORAL_PLACEHOLDER}|$)`,
    'g',
  );
  for (let previous = ''; previous !== result;) {
    previous = result;
    result = result.replace(fillerPattern, ' ');
  }

  result = result.replace(/\s*(?:ですね|ですよね)\s*(?=[、,])/g, ' ');
  result = result.split(TEMPORAL_PLACEHOLDER).join(' ');
  result = result.replace(/\s*[,、。]\s*/g, ' ');
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

function makeField(
  value: string | null,
  status: 'parsed' | 'unchanged' | 'ambiguous' | 'invalid',
  sourceText: string | null,
) {
  return { value, status, sourceText };
}

export function parseVoiceReminder(input: ReminderParserInput): ParsedReminder {
  const originalText = input.text;
  const normalizedText = normalizeVoiceReminderText(originalText);
  const dateCandidates = findDateCandidates(normalizedText, {
    currentDateTime: input.currentDateTime,
  });
  const timeCandidates = findTimeCandidates(normalizedText, {
    currentDateTime: input.currentDateTime,
  });

  const candidates: TemporalCandidate[] = [...dateCandidates, ...timeCandidates].sort(
    (first, second) => first.start - second.start,
  );
  for (const timeCandidate of timeCandidates) {
    if (timeCandidate.pairedDateValue) {
      candidates.push({
        ...timeCandidate,
        field: 'date',
        value: timeCandidate.pairedDateValue,
        kind: 'datetime',
      });
    }
  }
  candidates.sort((first, second) => first.start - second.start);

  const correctionResult = resolveCorrections(normalizedText, candidates);
  for (const candidate of candidates) {
    if (correctionResult.superseded.has(candidate)) {
      (candidate as TemporalCandidate & { superseded?: boolean }).superseded = true;
    }
  }

  let date = resolveField(candidates, 'date');
  let time = resolveField(candidates, 'time');
  const activeTimeCandidates = time.activeCandidates;
  const rolloverCandidates = activeTimeCandidates.filter((candidate) => candidate.rolloverDate);
  const activeDateCandidates = date.activeCandidates;

  if (rolloverCandidates.length > 0) {
    if (activeDateCandidates.length === 0) {
      const uiDate = parseIsoDate(input.currentUiDate);
      const nextDate = uiDate ? addLocalDays(uiDate, 1) : null;
      date = nextDate
        ? {
            value: formatDate(nextDate),
            status: 'parsed' as const,
            sourceText: joinSourceText(rolloverCandidates),
            activeCandidates: rolloverCandidates,
          }
        : {
            value: null,
            status: 'invalid' as const,
            sourceText: joinSourceText(rolloverCandidates),
            activeCandidates: rolloverCandidates,
          };
    } else if (date.status === 'parsed' && date.value) {
      const parsedDate = parseIsoDate(date.value);
      if (parsedDate) {
        const nextDate = addLocalDays(parsedDate, 1);
        date = {
          ...date,
          value: formatDate(nextDate),
          sourceText: joinSourceText([...activeDateCandidates, ...rolloverCandidates]),
        };
      }
    } else {
      time = { ...time, value: null, status: 'ambiguous' as const };
    }
  }

  const resultCandidates = candidates.filter((candidate) => !candidate.superseded);
  const title = cleanTitle(normalizedText, candidates, correctionResult.correctionRanges);
  const relativeCandidates = resultCandidates.filter(
    (candidate) => candidate.relativeDateTime && candidate.field === 'time',
  );

  return {
    originalText,
    normalizedText,
    title: { value: title, status: title ? 'parsed' : 'empty' },
    date: makeField(date.value, date.status, date.sourceText),
    time: makeField(time.value, time.status, time.sourceText),
    relativeDateTime: {
      detected: relativeCandidates.length > 0,
      sourceText: joinSourceText(relativeCandidates),
    },
    corrections: correctionResult.corrections,
    internalFlags: {
      multipleDateCandidates: date.activeCandidates.length > 1,
      multipleTimeCandidates: time.activeCandidates.length > 1,
      invalidDateDetected: candidates.some(
        (candidate) => candidate.field === 'date' && candidate.status === 'invalid',
      ),
      invalidTimeDetected: candidates.some(
        (candidate) => candidate.field === 'time' && candidate.status === 'invalid',
      ),
    },
  };
}
