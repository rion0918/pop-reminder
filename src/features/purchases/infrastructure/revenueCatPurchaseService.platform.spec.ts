import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readSource } from '../../../test-utils/sourceAssertions';
import { revenueCatPurchaseService } from './revenueCatPurchaseService';

const nativeSource = readSource(import.meta.url, './revenueCatPurchaseService.native.ts');
const fallbackSource = readSource(import.meta.url, './revenueCatPurchaseService.ts');

test('native purchase adapter owns RevenueCat SDK access and platform keys', () => {
  assert.match(nativeSource, /from 'react-native-purchases'/);
  assert.match(nativeSource, /from 'react-native-purchases-ui'/);
  assert.match(nativeSource, /EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY/);
  assert.match(nativeSource, /EXPO_PUBLIC_REVENUECAT_IOS_API_KEY/);
  assert.match(nativeSource, /requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID/);
  assert.match(nativeSource, /Purchases\.restorePurchases\(\)/);
  assert.doesNotMatch(fallbackSource, /react-native-purchases/);
});

test('non-native purchase adapter is fail-open and never presents billing UI', async () => {
  await revenueCatPurchaseService.configure();
  assert.equal(await revenueCatPurchaseService.getProAccessState(), 'unavailable');
  assert.equal(await revenueCatPurchaseService.presentProPaywallIfNeeded(), 'not-presented');
  assert.equal(await revenueCatPurchaseService.restoreProPurchase(), 'no-purchase');
});
