import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppServices } from '../../../bootstrap/AppProviders';

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

  return {
    settings: query.data ?? null,
    loading: query.isLoading,
    refresh: query.refetch,
    update: mutation.mutateAsync,
  };
}
