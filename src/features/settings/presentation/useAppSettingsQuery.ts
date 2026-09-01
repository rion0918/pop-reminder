import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppServices } from '../../../bootstrap/appServicesContext';

export const currentSettingsQueryKey = ['settings', 'current'] as const;

export function useAppSettingsQuery() {
  const services = useAppServices();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: currentSettingsQueryKey,
    queryFn: services.settings.get,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: services.settings.update,
    onSuccess: (settings) => queryClient.setQueryData(currentSettingsQueryKey, settings),
  });
  const previousNotifyTimeMutation = useMutation({
    mutationFn: (previousNotifyTime: string) =>
      services.reminders.updatePreviousNotifyTime(previousNotifyTime),
    onSuccess: (result) => queryClient.setQueryData(currentSettingsQueryKey, result.settings),
  });
  const analyticsConsentMutation = useMutation({
    mutationFn: services.settings.updateAnalyticsConsent,
    onSuccess: (settings) => queryClient.setQueryData(currentSettingsQueryKey, settings),
  });

  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    refresh: query.refetch,
    update: mutation.mutateAsync,
    updateAnalyticsConsent: analyticsConsentMutation.mutateAsync,
    updatePreviousNotifyTime: previousNotifyTimeMutation.mutateAsync,
    isUpdatingPreviousNotifyTime: previousNotifyTimeMutation.isPending,
  };
}
