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
  getDistinctId?(): string;
};

export type AnalyticsClientFactory<TClient extends AnalyticsClient = AnalyticsClient> = () =>
  TClient | null | Promise<TClient | null>;

export type AnalyticsServiceOptions = {
  configured?: boolean;
};

type QuickAddSource = 'home_button' | 'widget_deep_link' | 'raise_to_speak';
type ReminderSurface = 'home' | 'reminders_list';
type NotificationStatus = 'scheduled' | 'partial' | 'not-scheduled' | 'unchanged';
type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';
type ProPaywallPlacement = 'active_limit' | 'settings';

export const ALLOWED_ANALYTICS_EVENTS = [
  '$screen',
  'quick add opened',
  'reminder created',
  'reminder edited',
  'reminder deleted',
  'notification permission updated',
  'pro gate reached',
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
      ignoreAsyncFailure(client.capture(event, properties));
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
        ignoreAsyncFailure(client.screen(pathname));
      } catch {
        // Navigation must continue even when analytics is unavailable.
      }
    },

    captureQuickAddOpened(input: { source: QuickAddSource }) {
      capture('quick add opened', { source: input.source });
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
        date_preset: input.datePreset,
        notification_status: input.notificationStatus,
        ...(includeNotificationReason && input.notificationReason
          ? { notification_reason: input.notificationReason }
          : {}),
      });
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
    }) {
      capture('notification permission updated', {
        status: input.status,
        can_ask_again: input.canAskAgain,
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

    async setCaptureEnabled(enabled: boolean) {
      if (!enabled) {
        captureDisabled = true;
        if (!client) return false;

        try {
          await client.ready?.();
          await client.optOut();
          return !client.optedOut;
        } catch {
          return false;
        }
      }

      const activeClient = await ensureClient();
      if (!activeClient) return false;

      try {
        await activeClient.ready?.();
        await activeClient.optIn();
        captureDisabled = activeClient.optedOut;
        return !captureDisabled;
      } catch {
        captureDisabled = true;
        return false;
      }
    },

    async getDeletionRequestId() {
      if (!client?.getDistinctId) return null;

      try {
        await client.ready?.();
        return client.getDistinctId() || null;
      } catch {
        return null;
      }
    },
  };
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService<AnalyticsClient>>;
