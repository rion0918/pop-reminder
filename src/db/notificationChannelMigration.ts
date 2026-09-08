import { eq } from 'drizzle-orm';

import { db } from './client';
import { appSettings } from './schema';

const DEFAULT_SETTINGS_ID = 'default';

export const sqliteNotificationChannelMigrationRepository = {
  async getVersion() {
    const rows = await db
      .select({ version: appSettings.notificationChannelVersion })
      .from(appSettings)
      .where(eq(appSettings.id, DEFAULT_SETTINGS_ID))
      .limit(1);
    return rows[0]?.version ?? 0;
  },

  async setVersion(version: number) {
    await db
      .update(appSettings)
      .set({ notificationChannelVersion: version })
      .where(eq(appSettings.id, DEFAULT_SETTINGS_ID));
  },
};
