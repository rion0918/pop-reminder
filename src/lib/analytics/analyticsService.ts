import type { ReminderDatePreset } from '../../features/reminders/utils/reminderDatePresets';
import type {
  ProPaywallResult,
  ProRestoreResult,
} from '../../features/purchases/application/purchaseService';

export type AnalyticsClient = {
  optedOut: boolean;
  capture(event: string, properties?: Record<string, unknown>): unknown;
  screen(name: string, properties?: Record<string, unknown>): unknown;
  ready?(): unknown;
  optIn(): unknown;
  optOut(): unknown;
};

export type AnalyticsClientFactory<TClient extends AnalyticsClient = AnalyticsClient> = () =>
  TClient | null | Promise<TClient | null>;

export type AnalyticsServiceOptions = {
  configured?: boolean;
  context?: {
    analytics_version: number;
    environment: 'development' | 'production';
    platform: string;
    app_version?: string;
    app_build?: string;
  };
};

type QuickAddSource = 'home_button' | 'widget_deep_link' | 'raise_to_speak';
type ReminderSurface = 'home' | 'reminders_list';
type NotificationStatus = 'scheduled' | 'partial' | 'not-scheduled' | 'unchanged';
type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';
type ProPaywallPlacement = 'active_limit' | 'settings';

export const ALLOWED_ANALYTICS_EVENTS = [
  '$screen',
  'app active',
  'quick add opened',
  'quick add submitted',
  'quick add closed',
  'voice input started',
  'voice input result',
  'reminder created',
  'reminder creation failed',
  'reminder edited',
  'reminder deleted',
  'notification permission updated',
  'pro gate reached',
  'pro paywall requested',
  'pro paywall result',
  'pro restore result',
] as const;

const allowedAnalyticsEventSet = new Set<string>(ALLOWED_ANALYTICS_EVENTS);

export function isAllowedAnalyticsEvent(event: string) {
  return allowedAnalyticsEventSet.has(event);
}

function ignoreAsyncFailure(result: unknown) {
  if (result instanceof Promise) {
    void result.catch(() => {});
  }
}

export function createAnalyticsService<TClient extends AnalyticsClient = AnalyticsClient>(
  source: TClient | null | AnalyticsClientFactory<TClient>,
  options: AnalyticsServiceOptions = {},
) {
  const factory = typeof source === 'function' ? (source as AnalyticsClientFactory<TClient>) : null;
  let client: TClient | null = factory ? null : (source as TClient | null);
  let factoryPromise: Promise<TClient | null> | null = null;
  let captureDisabled = false;
  let consentRevision = 0;
  let consentTransition = Promise.resolve();
  let didCaptureMeasurementStart = false;
  let voiceInputPending = false;
  let quickAddVisit: {
    id: string;
    source: QuickAddSource;
    inputMode: 'text' | 'voice';
    openedAt: number;
    createdCount: number;
  } | null = null;

  const canCapture = () => !captureDisabled && client !== null && !client.optedOut;
  const withContext = (properties?: Record<string, unknown>) =>
    options.context ? { ...options.context, ...properties } : properties;
  const quickAddProperties = () =>
    quickAddVisit
      ? {
          quick_add_id: quickAddVisit.id,
          source: quickAddVisit.source,
          input_mode: quickAddVisit.inputMode,
        }
      : {};

  const ensureClient = async () => {
    if (client || !factory) return client;
    if (!factoryPromise) {
      factoryPromise = Promise.resolve(factory()).catch(() => null);
    }
    client = await factoryPromise;
    return client;
  };

  const capture = (
    event: (typeof ALLOWED_ANALYTICS_EVENTS)[number],
    properties?: Record<string, unknown>,
  ) => {
    if (captureDisabled || !client || client.optedOut) return;

    try {
      ignoreAsyncFailure(client.capture(event, withContext(properties)));
    } catch {
      // Analytics must never interrupt the user action being measured.
    }
  };

  return {
    get client() {
      return client;
    },
    configured: options.configured ?? source !== null,

    captureScreen(pathname: string) {
      if (captureDisabled || !client || client.optedOut) return;

      try {
        ignoreAsyncFailure(client.screen(pathname, withContext()));
      } catch {
        // Navigation must continue even when analytics is unavailable.
      }
    },

    captureAppActive(input: { source: 'measurement_started' | 'resume' }) {
      capture('app active', { source: input.source });
    },

    captureQuickAddOpened(input: { source: QuickAddSource; inputMode?: 'text' | 'voice' }) {
      if (!canCapture() || quickAddVisit) return;
      const openedAt = Date.now();
      quickAddVisit = {
        id: `${openedAt.toString(36)}-${Math.random().toString(36).slice(2)}`,
        source: input.source,
        inputMode: input.inputMode ?? 'text',
        openedAt,
        createdCount: 0,
      };
      capture('quick add opened', quickAddProperties());
    },

    captureQuickAddSubmitted(input: { datePreset: ReminderDatePreset; allDay: boolean }) {
      capture('quick add submitted', {
        ...quickAddProperties(),
        date_preset: input.datePreset,
        all_day: input.allDay,
      });
    },

    captureQuickAddClosed() {
      if (!quickAddVisit) return;
      capture('quick add closed', {
        quick_add_id: quickAddVisit.id,
        source: quickAddVisit.source,
        outcome: quickAddVisit.createdCount > 0 ? 'created' : 'dismissed',
        created_count: quickAddVisit.createdCount,
        elapsed_seconds: Math.max(0, (Date.now() - quickAddVisit.openedAt) / 1_000),
      });
      quickAddVisit = null;
    },

    captureVoiceInputStarted() {
      if (!canCapture() || voiceInputPending) return;
      voiceInputPending = true;
      if (quickAddVisit) quickAddVisit.inputMode = 'voice';
      capture('voice input started', quickAddProperties());
    },

    captureVoiceInputResult(input: {
      outcome:
        | 'success'
        | 'empty'
        | 'cancelled'
        | 'permission-denied'
        | 'unavailable'
        | 'timeout'
        | 'error';
    }) {
      if (!voiceInputPending) return;
      voiceInputPending = false;
      capture('voice input result', { ...quickAddProperties(), outcome: input.outcome });
    },

    captureReminderCreationFailed(input: { reason: 'active_limit' | 'save_failed' }) {
      capture('reminder creation failed', { ...quickAddProperties(), reason: input.reason });
    },

    captureReminderCreated(input: {
      source: QuickAddSource;
      datePreset: ReminderDatePreset;
      notificationStatus: Exclude<NotificationStatus, 'unchanged'>;
      notificationReason?: string;
    }) {
      const includeNotificationReason =
        input.notificationStatus === 'partial' || input.notificationStatus === 'not-scheduled';
      capture('reminder created', {
        source: input.source,
        ...quickAddProperties(),
        ...(quickAddVisit
          ? {
              first_in_quick_add: quickAddVisit.createdCount === 0,
              ...(quickAddVisit.createdCount === 0
                ? { elapsed_seconds: Math.max(0, (Date.now() - quickAddVisit.openedAt) / 1_000) }
                : {}),
            }
          : {}),
        date_preset: input.datePreset,
        notification_status: input.notificationStatus,
        ...(includeNotificationReason && input.notificationReason
          ? { notification_reason: input.notificationReason }
          : {}),
      });
      if (quickAddVisit) {
        quickAddVisit.createdCount += 1;
        quickAddVisit.inputMode = 'text';
      }
    },

    captureReminderEdited(input: {
      surface: ReminderSurface;
      field: 'title' | 'schedule';
      notificationStatus?: Exclude<NotificationStatus, 'unchanged'>;
      notificationReason?: string;
    }) {
      const includeNotificationResult = input.field === 'schedule' && input.notificationStatus;
      const includeNotificationReason =
        includeNotificationResult &&
        (input.notificationStatus === 'partial' || input.notificationStatus === 'not-scheduled');
      capture('reminder edited', {
        surface: input.surface,
        field: input.field,
        ...(includeNotificationResult ? { notification_status: input.notificationStatus } : {}),
        ...(includeNotificationReason && input.notificationReason
          ? { notification_reason: input.notificationReason }
          : {}),
      });
    },

    captureReminderDeleted(input: { surface: ReminderSurface; count: number }) {
      if (input.count <= 0) return;
      capture('reminder deleted', { surface: input.surface, count: input.count });
    },

    captureNotificationPermissionUpdated(input: {
      status: NotificationPermissionStatus;
      canAskAgain: boolean;
      source?: 'quick_add' | 'settings';
    }) {
      capture('notification permission updated', {
        status: input.status,
        can_ask_again: input.canAskAgain,
        ...(input.source ? { source: input.source } : {}),
      });
    },

    captureProGateReached(input: { source: QuickAddSource }) {
      capture('pro gate reached', { source: input.source });
    },

    captureProPaywallResult(input: { placement: ProPaywallPlacement; outcome: ProPaywallResult }) {
      capture('pro paywall result', {
        placement: input.placement,
        outcome: input.outcome,
      });
    },

    captureProPaywallRequested(input: { placement: ProPaywallPlacement }) {
      capture('pro paywall requested', { placement: input.placement });
    },

    captureProRestoreResult(input: { outcome: ProRestoreResult }) {
      capture('pro restore result', { outcome: input.outcome });
    },

    async getCaptureEnabled() {
      if (captureDisabled || !client) return false;

      try {
        await client.ready?.();
        return !client.optedOut;
      } catch {
        return false;
      }
    },

    setCaptureEnabled(enabled: boolean) {
      const revision = ++consentRevision;
      if (!enabled) {
        captureDisabled = true;
        didCaptureMeasurementStart = false;
        quickAddVisit = null;
        voiceInputPending = false;
      }

      const transition = consentTransition.then(async () => {
        if (!enabled) {
          if (!client) return false;
          try {
            await client.ready?.();
            await client.optOut();
            return !client.optedOut;
          } catch {
            return false;
          }
        }

        try {
          const activeClient = await ensureClient();
          if (!activeClient) return false;
          await activeClient.ready?.();
          await activeClient.optIn();
          if (revision !== consentRevision) return false;
          captureDisabled = activeClient.optedOut;
          if (!captureDisabled && !didCaptureMeasurementStart) {
            didCaptureMeasurementStart = true;
            capture('app active', { source: 'measurement_started' });
          }
          return !captureDisabled;
        } catch {
          captureDisabled = true;
          return false;
        }
      });
      consentTransition = transition.then(() => undefined);
      return transition;
    },
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService<AnalyticsClient>>;
