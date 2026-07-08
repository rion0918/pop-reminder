import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireFromRoot = createRequire(resolve(repoRoot, 'package.json'));

function rootPath(relativePath: string): string {
  return resolve(repoRoot, relativePath);
}

function readRootSource(relativePath: string): string {
  return readFileSync(rootPath(relativePath), 'utf8');
}

test('nativewind dependencies are declared explicitly', () => {
  const packageConfig = JSON.parse(readRootSource('package.json'));

  assert.match(packageConfig.dependencies.nativewind, /^\^4(\.|$)/);
  assert.equal(packageConfig.dependencies['react-native-css-interop'], '0.2.6');
  assert.match(requireFromRoot.resolve('react-native-css-interop/jsx-runtime'), /jsx-runtime/);
  assert.match(packageConfig.devDependencies.tailwindcss, /^\^3\.4\./);
  assert.match(packageConfig.devDependencies['prettier-plugin-tailwindcss'], /^\^0\.5\./);
  assert.match(packageConfig.devDependencies['babel-preset-expo'], /^[~^]54\./);
});

test('nativewind Babel and Metro setup is present', () => {
  const babelConfig = readRootSource('babel.config.js');
  const metroConfigPath = rootPath('metro.config.js');

  assert.match(babelConfig, /\['babel-preset-expo', \{ jsxImportSource: 'nativewind' \}\]/);
  assert.match(babelConfig, /'nativewind\/babel'/);
  assert.match(babelConfig, /plugins: \['react-native-reanimated\/plugin'\]/);
  assert.equal(existsSync(metroConfigPath), true);

  const metroConfig = readRootSource('metro.config.js');

  assert.match(metroConfig, /withNativeWind\(config, \{ input: '\.\/global\.css' \}\)/);
});

test('tailwind config exposes app color tokens without platform-specific colors', () => {
  const tailwindConfig = readRootSource('tailwind.config.js');

  assert.match(tailwindConfig, /presets: \[require\('nativewind\/preset'\)\]/);
  assert.match(tailwindConfig, /'\.\/src\/\*\*\/\*\.\{js,jsx,ts,tsx\}'/);
  assert.match(tailwindConfig, /app: \{/);
  assert.match(tailwindConfig, /ink: '#263151'/);
  assert.match(tailwindConfig, /'sky-deep': '#74BDF6'/);
  assert.doesNotMatch(tailwindConfig, /android:/);
  assert.doesNotMatch(tailwindConfig, /ios:/);
});

test('global CSS and TypeScript NativeWind types are wired from the root layout', () => {
  const appConfig = JSON.parse(readRootSource('app.json'));

  assert.match(readRootSource('global.css'), /@tailwind base;\n/);
  assert.match(readRootSource('global.css'), /@tailwind components;\n/);
  assert.match(readRootSource('global.css'), /@tailwind utilities;\n/);
  assert.match(readRootSource('nativewind-env.d.ts'), /<reference types="nativewind\/types" \/>/);
  assert.match(readRootSource('src/app/_layout.tsx'), /import '\.\.\/\.\.\/global\.css';/);
  assert.equal(appConfig.expo.web.bundler, 'metro');
});
