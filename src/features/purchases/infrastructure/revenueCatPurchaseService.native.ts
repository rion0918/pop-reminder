import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import {
  PRO_ENTITLEMENT_ID,
  type ProPaywallResult,
  type PurchaseService,
} from '../application/purchaseService';

let configured = false;

function getPlatformApiKey() {
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';
  }
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
  }
  return '';
}

function hasProEntitlement(customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>) {
  return customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive === true;
}

function mapPaywallResult(result: PAYWALL_RESULT): ProPaywallResult {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'purchased';
    case PAYWALL_RESULT.RESTORED:
      return 'restored';
    case PAYWALL_RESULT.CANCELLED:
      return 'cancelled';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'not-presented';
    default:
      return 'error';
  }
}

export const revenueCatPurchaseService: PurchaseService = {
  async configure() {
    const apiKey = getPlatformApiKey();
    if (!apiKey) return;

    try {
      if (await Purchases.isConfigured()) {
        configured = true;
        return;
      }
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      Purchases.configure({ apiKey });
      configured = true;
    } catch (error) {
      configured = false;
      console.warn('Failed to configure RevenueCat', error);
    }
  },

  async getProAccessState() {
    if (!configured) return 'unavailable';

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return hasProEntitlement(customerInfo) ? 'pro' : 'free';
    } catch (error) {
      console.warn('Failed to read RevenueCat customer info', error);
      return 'unavailable';
    }
  },

  async presentProPaywallIfNeeded() {
    if (!configured) return 'error';

    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
        displayCloseButton: true,
      });
      return mapPaywallResult(result);
    } catch (error) {
      console.warn('Failed to present RevenueCat paywall', error);
      return 'error';
    }
  },

  async restoreProPurchase() {
    if (!configured) return 'error';

    try {
      const customerInfo = await Purchases.restorePurchases();
      return hasProEntitlement(customerInfo) ? 'restored' : 'no-purchase';
    } catch (error) {
      console.warn('Failed to restore RevenueCat purchases', error);
      return 'error';
    }
  },
};
