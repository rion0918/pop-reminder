const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withAndroidVoskModel(config, { models = [] } = {}) {
  if (models.length === 0) return config;

  return withGradleProperties(config, (configWithProperties) => {
    const key = 'Vosk_models';
    const value = models.join(',');
    const existing = configWithProperties.modResults.find(
      (property) => property.type === 'property' && property.key === key,
    );

    if (existing) {
      existing.value = value;
    } else {
      configWithProperties.modResults.push({ type: 'property', key, value });
    }

    return configWithProperties;
  });
};
