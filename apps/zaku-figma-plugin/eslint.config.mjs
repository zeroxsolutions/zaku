import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  // components/ui and lib/utils.ts are shadcn's, written by its CLI and never edited (the formatter skips them too).
  { ignores: ['**/dist-sandbox', 'src/components/ui', 'src/lib/utils.ts'] },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
];
