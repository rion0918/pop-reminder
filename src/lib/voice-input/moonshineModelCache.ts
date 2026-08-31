import { deleteAsync, documentDirectory, getInfoAsync } from 'expo-file-system/legacy';

import {
  hasCompleteMoonshineModelCache,
  MOONSHINE_MODEL_CACHE_FILES,
} from './moonshineModelCacheCore';

/**
 * Sherpa-ONNX caches bundled assets under files/models and skips extraction when
 * that directory already exists. Remove an incomplete cache left by an older APK
 * so a later build can populate the model files.
 */
export async function removeIncompleteMoonshineModelCache() {
  if (!documentDirectory) return;

  const modelDirectory = `${documentDirectory}models/moonshine-tiny-ja`;
  const files = await Promise.all(
    MOONSHINE_MODEL_CACHE_FILES.map(async (fileName) => {
      try {
        return await getInfoAsync(`${modelDirectory}/${fileName}`);
      } catch {
        return { exists: false };
      }
    }),
  );

  if (hasCompleteMoonshineModelCache(files)) return;
  await deleteAsync(modelDirectory, { idempotent: true }).catch(() => {});
}
