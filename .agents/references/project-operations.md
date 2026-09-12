# pop-reminder project operations and references

Use the relevant section for setup, builds, verification, or implementation navigation. `AGENTS.md` defines repository constraints; package scripts, tests, Biome, and CI define the executable checks.

## Environment and setup

- Use `nix develop` or direnv. Node.js is pinned in `.node-version`, pnpm in `package.json`.
- Initial setup: `pnpm install`, then `pnpm run mvh:setup`.

## Development and device commands

- Development Build Metro: `pnpm run start:dev-client`.
- Expo Go, for flows without the native behavior requiring a Development Build: `pnpm run start:expo-go`.
- Local native builds: `pnpm run android` or `pnpm run ios`.
- EAS development binary: `eas build --profile development --platform android` or `eas build --profile development --platform ios`.
- Device QA: `docs/QA_DEVELOPMENT_BUILD.md`; release procedures: `docs/RELEASE_ANDROID_IOS.md`.

## Verification and harness

- `pnpm run mvh:verify` runs formatting, protected-file guard, Biome, tests, typecheck, and Expo lint. Use `pnpm run mvh:feedback` for structured feedback.
- `pnpm test` runs Node tests (`config.release.test.js`, `*.test.js`, `*.spec.ts(x)` excluding UI specs), then Jest UI tests (`*.ui.spec.tsx`). See `package.json` and `jest.config.cjs` for exact selection.
- Run an affected Node spec with `node --import tsx --test path/to/file.spec.ts`; a UI spec with `pnpm exec jest --config jest.config.cjs --runInBand path/to/file.ui.spec.tsx`.
- Source contracts use `src/test-utils/sourceAssertions.ts`; architecture rules live in `tools/biome-rules/`.
- For harness operation or approved protected-file changes, read `docs/MVH_HARNESS.md` and `docs/adr/0001-harness-policy.md`. Final verification of explicitly approved harness changes uses `MVH_ALLOW_PROTECTED_CONFIG_CHANGE=1 pnpm run mvh:verify`.
- Release validation: `pnpm run verify:release` also checks Expo Doctor and Android/iOS exports.

## Implementation entry points

- Startup and deep links: `src/app/_layout.tsx`, `src/bootstrap/`.
- Reminder flow: `src/features/reminders/screens/HomeScreen.tsx`, `src/features/reminders/presentation/useRemindersQuery.ts`, `src/features/reminders/application/reminderUseCases.ts`.
- Reminder persistence: `src/features/reminders/infrastructure/sqliteReminderRepository.ts`; schema and compatibility initialization: `src/db/schema.ts`, `src/db/client.ts`, `src/db/migrations.ts`.
- Input validation: `src/features/reminders/schemas/reminderSchema.ts` and the feature's date services/utilities.
- Notifications: `src/lib/notifications/reminderNotifications.ts`; Widget synchronization: `src/widget/widgetUpdateService.tsx`.
- UI uses NativeWind / Tailwind and Reanimated. Colors and tokens: `src/constants/colors.ts`, `tailwind.config.js`. Bubble burst: `ReminderBubbleBurst.native.tsx` for iOS, `ReminderBubbleBurst.android.tsx` for Android in `src/features/reminders/components/`.
- For architecture decisions use `docs/NEW_ARCHITECTURE_ALIGNMENT.md`; for stack details use `docs/TECH_STACK.md`.
