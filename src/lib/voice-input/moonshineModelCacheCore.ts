export const MOONSHINE_MODEL_CACHE_FILES = [
  'encoder_model.ort',
  'decoder_model_merged.ort',
  'tokens.txt',
] as const;

export type MoonshineModelCacheFileInfo = {
  exists: boolean;
  isDirectory?: boolean;
};

export function getMoonshineModelAssetPaths(modelPath: string) {
  return MOONSHINE_MODEL_CACHE_FILES.map((fileName) => `${modelPath}/${fileName}`);
}

export function hasCompleteMoonshineModelCache(files: readonly MoonshineModelCacheFileInfo[]) {
  return (
    files.length === MOONSHINE_MODEL_CACHE_FILES.length &&
    files.every((file) => file.exists && file.isDirectory !== true)
  );
}
