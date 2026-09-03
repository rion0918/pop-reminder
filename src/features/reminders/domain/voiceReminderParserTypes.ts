export type VoiceParseStatus = 'parsed' | 'unchanged' | 'ambiguous' | 'invalid';

export type ParseStatus = VoiceParseStatus;

export type ParsedVoiceField<T> = {
  value: T | null;
  status: VoiceParseStatus;
  sourceText: string | null;
};

export type ParsedField<T> = ParsedVoiceField<T>;

export type ParsedReminder = {
  originalText: string;
  normalizedText: string;
  title: {
    value: string;
    status: 'parsed' | 'empty';
  };
  date: ParsedField<string>;
  time: ParsedField<string>;
  relativeDateTime: {
    detected: boolean;
    sourceText: string | null;
  };
  corrections: {
    detected: boolean;
    before: string | null;
    after: string | null;
  }[];
  internalFlags: {
    multipleDateCandidates: boolean;
    multipleTimeCandidates: boolean;
    invalidDateDetected: boolean;
    invalidTimeDetected: boolean;
  };
};

export type ReminderParserInput = {
  text: string;
  currentDateTime: Date;
  currentUiDate: string;
  currentUiTime: string;
};

export type TemporalCandidate = {
  field: 'date' | 'time';
  start: number;
  end: number;
  sourceText: string;
  status: 'valid' | 'ambiguous' | 'invalid';
  value: string | null;
  kind: 'date' | 'time' | 'datetime';
  rolloverDate: boolean;
  relativeDateTime: boolean;
  pairedDateValue: string | null;
  superseded?: boolean;
};

export type DateParseContext = {
  currentDateTime: Date;
};

export type TimeParseContext = {
  currentDateTime: Date;
};
