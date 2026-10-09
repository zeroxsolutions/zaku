import type { Check } from './findings.js';
import { exitCode, formatReport, runChecks } from './run-checks.js';
import { testInput } from '../../test/fixtures.fixture.js';

const passes: Check = () => ({ findings: [] });
const fails: Check = () => ({
  findings: [
    {
      check: 'coverage',
      feature: 'auth',
      screen: 'sign-in',
      frame: 'Sign in / Default / Desktop',
      nodeId: '1:2',
      message: 'no frame drawn',
    },
  ],
});
const cannot: Check = () => ({ notRun: 'library.json is missing' });

describe('runChecks', () => {
  it('sorts each check into passed, failed or not run, in CHECK_IDS order', () => {
    const report = runChecks(testInput(), {
      coverage: fails,
      reachability: passes,
      library: cannot,
    });
    expect(report.passed).toEqual(['reachability']);
    expect(report.findings).toHaveLength(1);
    expect(report.notRun).toEqual([{ check: 'library', reason: 'library.json is missing' }]);
  });
});

describe('exitCode', () => {
  it('is 1 on any finding, 2 when only a check could not run, and 0 otherwise', () => {
    expect(exitCode({ findings: [{ check: 'copy', message: 'x' }], notRun: [], passed: [] })).toBe(1);
    expect(exitCode({ findings: [], notRun: [{ check: 'library', reason: 'x' }], passed: [] })).toBe(2);
    expect(exitCode({ findings: [], notRun: [], passed: ['copy'] })).toBe(0);
  });
});

describe('formatReport', () => {
  it('prints one FAIL line per finding with its node id, then the summary', () => {
    const lines = formatReport(runChecks(testInput(), { coverage: fails, library: cannot }));
    expect(lines).toEqual([
      'FAIL coverage auth/sign-in "Sign in / Default / Desktop" 1:2: no frame drawn',
      'NOT RUN library: library.json is missing',
      'zaku check: 1 findings, 1 not run, 0 passed',
    ]);
  });
});
