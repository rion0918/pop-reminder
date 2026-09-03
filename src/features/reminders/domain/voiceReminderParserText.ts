const KANJI_DIGIT_PATTERN = /[零〇一二三四五六七八九十百千万]+/;

const KANJI_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const KANJI_UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1_000,
  万: 10_000,
};

function parseKanjiNumber(value: string) {
  if (
    !value ||
    [...value].some((character) => !(character in KANJI_DIGITS) && !(character in KANJI_UNITS))
  ) {
    return null;
  }

  if ([...value].every((character) => character in KANJI_DIGITS)) {
    return Number([...value].map((character) => KANJI_DIGITS[character]).join(''));
  }

  let total = 0;
  let section = 0;
  let digit = 0;
  for (const character of value) {
    if (character in KANJI_DIGITS) {
      digit = KANJI_DIGITS[character];
      continue;
    }

    const unit = KANJI_UNITS[character];
    if (unit === 10_000) {
      section += digit;
      total += (section || 1) * unit;
      section = 0;
      digit = 0;
      continue;
    }

    section += (digit || 1) * unit;
    digit = 0;
  }

  return total + section + digit;
}

function normalizeTemporalNumbers(value: string) {
  const temporalUnit = /(?=年|月|日|週|週間|時間|時|分)/;
  return value.replace(
    new RegExp(`(${KANJI_DIGIT_PATTERN.source}|\\d+)\\s*${temporalUnit.source}`, 'g'),
    (match, numberText: string) =>
      `${numberText.match(/^\d+$/) ? numberText : (parseKanjiNumber(numberText) ?? numberText)}${match.slice(numberText.length)}`,
  );
}

export function normalizeVoiceReminderText(value: string) {
  const normalized = value
    .normalize('NFKC')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  return normalizeTemporalNumbers(normalized).replace(
    /(\d)\s+(?=(?:年|月|日|週|週間|時間|時|分))/g,
    '$1',
  );
}

export function parseNumericText(value: string) {
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return parseKanjiNumber(normalized);
}
