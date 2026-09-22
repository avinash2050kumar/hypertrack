/** @type {import('prettier').Config & import('@ianvs/prettier-plugin-sort-imports').PluginConfig} */
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  // external → internal absolute → relative; parents before siblings
  importOrder: ['<BUILTIN_MODULES>', '<THIRD_PARTY_MODULES>', '', '^@hypertrack/(.*)$', '', '^[.]'],
  importOrderParserPlugins: ['typescript', 'jsx'],
  importOrderTypeScriptVersion: '4.4.0',
  overrides: [
    { files: '*.md', options: { proseWrap: 'preserve' } },
    { files: ['*.json', '*.jsonc'], options: { trailingComma: 'none' } },
  ],
};
