const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
} = require('expo/config-plugins');

const SHERPA_MODEL_DESTINATION = path.join('app', 'src', 'main', 'assets', 'models');
const CODEGEN_ORDERING_MARKER =
  '// pop-reminder: ensure autolinked TurboModule codegen runs before CMake.';
const CODEGEN_ORDERING_BLOCK = `
${CODEGEN_ORDERING_MARKER}
// React Native 0.81 can otherwise reference a library's generated JNI directory too early.
afterEvaluate {
    def cmakeTasks = tasks.matching {
        it.name.startsWith("configureCMake") || it.name.startsWith("buildCMake")
    }
    rootProject.subprojects.each { subproject ->
        if (subproject == project) return
        subproject.tasks.matching { it.name == "preBuild" }.all { preBuildTask ->
            cmakeTasks.configureEach { it.dependsOn(preBuildTask) }
        }
        subproject.tasks.matching {
            it.name.startsWith("prefab") && it.name.endsWith("Package")
        }.all { prefabTask ->
            cmakeTasks.configureEach { it.dependsOn(prefabTask) }
        }
    }
}
`;

function copyModelAsset(config, modelPath) {
  return withDangerousMod(config, [
    'android',
    (configWithMod) => {
      const sourcePath = path.join(configWithMod.modRequest.projectRoot, modelPath);
      const destinationPath = path.join(
        configWithMod.modRequest.platformProjectRoot,
        SHERPA_MODEL_DESTINATION,
        path.basename(modelPath),
      );

      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Moonshine model asset does not exist: ${sourcePath}`);
      }

      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.rmSync(destinationPath, { recursive: true, force: true });
      fs.mkdirSync(destinationPath, { recursive: true });
      for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
        if (!entry.isFile()) continue;

        const sourceFile = path.join(sourcePath, entry.name);
        const destinationName = entry.name.endsWith('.gz')
          ? entry.name.slice(0, -'.gz'.length)
          : entry.name;
        const destinationFile = path.join(destinationPath, destinationName);
        if (entry.name.endsWith('.gz')) {
          fs.writeFileSync(destinationFile, zlib.gunzipSync(fs.readFileSync(sourceFile)));
        } else {
          fs.cpSync(sourceFile, destinationFile);
        }
      }
      return configWithMod;
    },
  ]);
}

function ensureCodegenRunsBeforeCmake(config) {
  return withAppBuildGradle(config, (configWithGradle) => {
    if (!configWithGradle.modResults.contents.includes(CODEGEN_ORDERING_MARKER)) {
      configWithGradle.modResults.contents += CODEGEN_ORDERING_BLOCK;
    }
    return configWithGradle;
  });
}

module.exports = function withAndroidSherpaModel(config, { modelPath } = {}) {
  if (!modelPath) return config;

  let configWithProperties = withGradleProperties(config, (configWithGradleProperties) => {
    const properties = configWithGradleProperties.modResults;
    for (const key of ['sherpaOnnxDisableFfmpeg', 'sherpaOnnxDisableLibarchive']) {
      const existing = properties.find(
        (property) => property.type === 'property' && property.key === key,
      );
      if (existing) {
        existing.value = 'true';
      } else {
        properties.push({ type: 'property', key, value: 'true' });
      }
    }

    return configWithGradleProperties;
  });

  configWithProperties = ensureCodegenRunsBeforeCmake(configWithProperties);
  configWithProperties = copyModelAsset(configWithProperties, modelPath);
  return configWithProperties;
};
