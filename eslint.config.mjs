import nx from '@nx/eslint-plugin';
import formatterOwnsLayout from 'eslint-config-prettier/flat';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    // worker-configuration.d.ts and cloudflare-env.d.ts are both `wrangler types` output, the
    // second under the OpenNext adapter's `--env-interface` name. Each ships its own blanket
    // `/* eslint-disable */`, which `reportUnusedDisableDirectives` then flags on the file's
    // own nested disables.
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vitest.config.*.timestamp*',
      '**/worker-configuration.d.ts',
      '**/cloudflare-env.d.ts',
      '**/test-output',
      '**/.next',
      '**/.open-next',
      '**/.wrangler',
      '**/vite.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts', '**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    rules: {
      // In no preset, so the house takes it here: without an annotation a function's published
      // signature is whatever its body last inferred, and an edit inside the body rewrites the
      // emitted .d.ts a consumer compiles against with nothing in the diff pointing at it.
      '@typescript-eslint/explicit-function-return-type': 'error',
      // Only the invisible half of the plain-ASCII rule is mechanical: a zero-width space or a BOM is
      // not something a reviewer fails to catch, it is something no reviewer can catch, and it corrupts
      // grep and diffs downstream. The visible glyphs get no check at all - a person reaching for a key
      // does not type an em dash, so a hook would tax every human commit for what only an agent emits.
      'no-irregular-whitespace': 'error',
    },
  },
  // Named, not left to Nx's presets: they add eslint-config-prettier only while `prettier` itself
  // resolves, which oxfmt leaves to whichever dependency pulls prettier in and how pnpm hoists it,
  // so the same commit can lint green on a fresh install and red on an older one. oxfmt owns layout
  // as prettier did, so the rules that would fight it stay off on every install.
  formatterOwnsLayout,
];
