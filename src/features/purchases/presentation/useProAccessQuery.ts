import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAppServices } from '../../../bootstrap/appServicesContext';

export const proAccessQueryKey = ['purchases', 'pro-access'] as const;

export function useProAccessQuery() {
  const purchases = useAppServices().purchases;
  const query = useQuery({
    queryKey: proAccessQueryKey,
    queryFn: () => purchases.getProAccessState(),
    retry: false,
  });
  const { data, isLoading, refetch } = query;

  const refresh = useCallback(async () => {
    const result = await refetch();
    return result.data ?? 'unavailable';
  }, [refetch]);

  return {
    proAccessState: data ?? 'unavailable',
    isProAccessLoading: isLoading,
    refreshProAccess: refresh,
  };
}
