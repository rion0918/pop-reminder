export const PRO_ENTITLEMENT_ID = 'pro';

export type ProAccessState = 'free' | 'pro' | 'unavailable';

export type ProPaywallResult = 'purchased' | 'restored' | 'cancelled' | 'not-presented' | 'error';

export type ProRestoreResult = 'restored' | 'no-purchase' | 'error';

export type PurchaseService = {
  configure(): Promise<void>;
  getProAccessState(): Promise<ProAccessState>;
  presentProPaywallIfNeeded(): Promise<ProPaywallResult>;
  restoreProPurchase(): Promise<ProRestoreResult>;
};
