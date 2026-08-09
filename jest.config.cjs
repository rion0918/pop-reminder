module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.ui.spec.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|react-native-reanimated|react-native-worklets))',
  ],
};
