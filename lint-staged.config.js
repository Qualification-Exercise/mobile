module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{ts,tsx}': () => 'npm run typecheck',
  '*.{json,md,yml,yaml}': ['prettier --write'],
  'wdk.config.js': () => 'npm run wdk:bundle',
};
