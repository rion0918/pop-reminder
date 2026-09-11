# pop-reminder project operations and references

Read this file when work involves setup, native/device behavior, release builds, the MVH harness, architecture boundaries, or locating representative implementations. The repository `AGENTS.md` remains the source of mandatory constraints; this file only holds the detailed commands and navigation map.

## Environment and setup

- Use `nix develop` or direnv. The pinned Node.js version is `.node-version` 24.16.0 and pnpm is 10.8.1.
- Initial setup is `pnpm install` followed by `pnpm run mvh:setup`.

## Development and device commands

- Start the Development Build Metro with `pnpm run start:dev-client`.
- Start Expo Go only for flows that do not require native behavior with `pnpm run start:expo-go`.
- Run native locally with `pnpm run android` or `pnpm run ios`.
- Build a development binary with `eas build --profile development --platform android` or `eas build --profile development --platform ios`.
- Follow `docs/RELEASE_ANDROID_IOS.md` for release procedures.
- Use `pnpm run mvh:feedback` for structured MVH feedback and `pnpm run mvh:setup` for hook initialization.

## Architecture and policy references

- Technical stack: `docs/TECH_STACK.md`.
- External-boundary policy: `docs/NEW_ARCHITECTURE_ALIGNMENT.md`.
- MVH policy and protected-file handling: `docs/MVH_HARNESS.md` and `docs/adr/0001-harness-policy.md`.

## Representative entry points

- Startup, notifications, and deep links: `src/app/_layout.tsx` and `src/bootstrap/`.
- Database: `src/db/client.ts` and `src/db/migrations.ts`.
- Notifications: `src/lib/notifications/reminderNotifications.ts`.
- Reminder screen-to-use-case flow: `src/features/reminders/screens/HomeScreen.tsx`, `src/features/reminders/presentation/useRemindersQuery.ts`, and `src/features/reminders/application/reminderUseCases.ts`.
