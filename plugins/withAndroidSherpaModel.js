const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const CODEGEN_ORDERING_MARKER =
  '// pop-reminder: ensure autolinked TurboModule codegen runs before CMake.';
const MOONSHINE_ASSET_MARKER =
  '// pop-reminder: generate Moonshine assets during every Android build.';
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

const MOONSHINE_ASSET_BLOCK = `
${MOONSHINE_ASSET_MARKER}
// Keep the reviewed compressed model in the repository and expand it only under build/.
def moonshineModelSourceDir = file(projectRoot + "/assets/models/moonshine-tiny-ja")
def moonshineModelGeneratedAssetsDir = layout.buildDirectory.dir("generated/moonshineModelAssets")
def moonshineModelFiles = [
    "encoder_model.ort.gz": "encoder_model.ort",
    "decoder_model_merged.ort.gz": "decoder_model_merged.ort",
    "tokens.txt": "tokens.txt",
    "LICENSE": "LICENSE",
    "NOTICE": "NOTICE",
]
tasks.register("prepareMoonshineModelAssets") {
    inputs.dir(moonshineModelSourceDir)
    outputs.dir(moonshineModelGeneratedAssetsDir)
    doLast {
        if (!moonshineModelSourceDir.isDirectory()) {
            throw new GradleException("Moonshine model source directory does not exist: \${moonshineModelSourceDir}")
        }
        def outputDir = moonshineModelGeneratedAssetsDir.get().dir("models/moonshine-tiny-ja").asFile
        delete(outputDir)
        outputDir.mkdirs()
        moonshineModelFiles.each { sourceName, targetName ->
            def sourceFile = new File(moonshineModelSourceDir, sourceName)
            if (!sourceFile.isFile()) {
                throw new GradleException("Moonshine model file does not exist: \${sourceFile}")
            }
            def targetFile = new File(outputDir, targetName)
            if (sourceName.endsWith(".gz")) {
                new java.util.zip.GZIPInputStream(new java.io.FileInputStream(sourceFile)).withCloseable { input ->
                    targetFile.withOutputStream { output -> input.transferTo(output) }
                }
            } else {
                sourceFile.withInputStream { input ->
                    targetFile.withOutputStream { output -> input.transferTo(output) }
                }
            }
        }
    }
}
android.sourceSets.main.assets.srcDir(moonshineModelGeneratedAssetsDir)
tasks.matching { it.name ==~ /merge.*Assets/ }.configureEach {
    dependsOn(tasks.named("prepareMoonshineModelAssets"))
}
`;

function ensureCodegenRunsBeforeCmake(config) {
  return withAppBuildGradle(config, (configWithGradle) => {
    const contents = configWithGradle.modResults.contents;
    if (!contents.includes(CODEGEN_ORDERING_MARKER)) {
      configWithGradle.modResults.contents += CODEGEN_ORDERING_BLOCK;
    }
    if (!contents.includes(MOONSHINE_ASSET_MARKER)) {
      configWithGradle.modResults.contents += MOONSHINE_ASSET_BLOCK;
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
  return configWithProperties;
};
