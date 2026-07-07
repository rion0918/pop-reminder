import { useCallback, useEffect, useState } from 'react';

import { getAppSettings, updateAppSettings } from '../services/settingsRepository';
import type { AppSettings, UpdateAppSettingsInput } from '../types/appSettings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const next = await getAppSettings();
      setSettings(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (input: UpdateAppSettingsInput) => {
    const next = await updateAppSettings(input);
    setSettings(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    settings,
    loading,
    refresh,
    update,
  };
}
