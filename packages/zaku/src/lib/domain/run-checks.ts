import { CHECK_IDS, type Check, type CheckId, type CheckInput, type Finding, type NotRun } from './findings.js';

export interface CheckReport {
  findings: Finding[];
  notRun: NotRun[];
  passed: CheckId[];
}

export function runChecks(input: CheckInput, checks: Partial<Record<CheckId, Check>>): CheckReport {
  const report: CheckReport = { findings: [], notRun: [], passed: [] };
  for (const id of CHECK_IDS) {
    const check = checks[id];
    if (!check) continue;
    const outcome = check(input);
    if ('notRun' in outcome) report.notRun.push({ check: id, reason: outcome.notRun });
    else if (outcome.findings.length > 0) report.findings.push(...outcome.findings);
    else report.passed.push(id);
  }
  return report;
}

export function exitCode(report: CheckReport): 0 | 1 | 2 {
  if (report.findings.length > 0) return 1;
  if (report.notRun.length > 0) return 2;
  return 0;
}

export function formatFinding(finding: Finding): string {
  const where = [
    finding.feature && finding.screen ? `${finding.feature}/${finding.screen}` : finding.feature,
    finding.frame ? `"${finding.frame}"` : undefined,
    finding.nodeId,
    finding.field,
  ].filter((part): part is string => Boolean(part));
  return `FAIL ${finding.check}${where.length > 0 ? ` ${where.join(' ')}` : ''}: ${finding.message}`;
}

export function formatReport(report: CheckReport): string[] {
  return [
    ...report.findings.map(formatFinding),
    ...report.notRun.map((entry) => `NOT RUN ${entry.check}: ${entry.reason}`),
    `zaku check: ${report.findings.length} findings, ${report.notRun.length} not run, ${report.passed.length} passed`,
  ];
}
