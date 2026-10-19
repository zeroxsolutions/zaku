// The Conventional Commits preset, narrowed to the types this repo writes and the subject length a
// one-line log keeps whole. A body line runs as long as its sentence or its link does, and a merge
// commit names no change of its own, so neither is checked.
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [(message) => /^merge\b/i.test(message)],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'build', 'ci', 'perf']],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
