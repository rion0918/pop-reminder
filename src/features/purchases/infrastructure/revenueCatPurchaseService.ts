import type { PurchaseService } from '../application/purchaseService';

export const revenueCatPurchaseService: PurchaseService = {
  async configure() {},
  async getProAccessState() {
    return 'unavailable';
  },
  async presentProPaywallIfNeeded() {
    return 'not-presented';
  },
  async restoreProPurchase() {
    return 'no-purchase';
  },
};
