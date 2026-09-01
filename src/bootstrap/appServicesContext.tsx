import { createContext, type PropsWithChildren, useContext } from 'react';

import { appServices, type AppServices } from './appServices';

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: PropsWithChildren) {
  return <AppServicesContext.Provider value={appServices}>{children}</AppServicesContext.Provider>;
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('AppServicesProvider is missing');
  return services;
}
