import { test } from 'node:test';

import { assertSourceIncludes, readSource } from '../../../test-utils/sourceAssertions';

const source = readSource(import.meta.url, './ReminderListScreen.tsx');

test('reminder list summary keeps count inside narrow Android widths', () => {
  assertSourceIncludes(source, [
    /<View className="min-w-0 flex-1">/,
    /<Text numberOfLines=\{1\} className="text-\[12px\] font-extrabold text-app-muted">/,
    /<Text[\s\S]*className="mt-\[5px\] text-\[22px\] font-black leading-\[29px\] text-app-ink"[\s\S]*numberOfLines=\{2\}/,
    /<View className="min-h-\[42px\] min-w-\[58px\] max-w-\[34%\] shrink-0/,
    /<Text[\s\S]*numberOfLines=\{1\}[\s\S]*adjustsFontSizeToFit[\s\S]*minimumFontScale=\{0\.82\}[\s\S]*style=\{styles\.noFontPadding\}/,
    /noFontPadding: \{[\s\S]*includeFontPadding: false,/,
  ]);
});

test('reminder list reflects edited titles without leaving the list', () => {
  assertSourceIncludes(source, [
    /import \{ useRemindersQuery as useReminders \} from '..\/presentation\/useRemindersQuery';/,
    /deleteReminder,/,
    /updateReminderTitle,/,
    /const \[selectedReminderId, setSelectedReminderId\] = useState<string \| null>\(null\);/,
    /const selectedReminder = reminders\.find\(\(reminder\) => reminder\.id === selectedReminderId\) \?\? null;/,
    /const handleUpdateReminderTitle = useCallback\(/,
    /const updatedReminder = await updateReminderTitle\(reminder\.id, title\);/,
    /onPress=\{\(\) => setSelectedReminderId\(reminder\.id\)\}/,
    /onUpdateTitle=\{handleUpdateReminderTitle\}/,
  ]);
});
