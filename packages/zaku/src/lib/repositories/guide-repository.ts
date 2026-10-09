import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CheckId } from '../domain/findings.js';
import { formatRule, RULE_GUIDES } from '../domain/rules.js';

export interface IGuideRepository {
  topics(): Promise<string[]>;
  read(topic: string): Promise<string | null>;
}

const TOPIC = /^[a-z][a-z0-9-]*$/;

/** The plugin's skills, one SKILL.md per folder, and the rule pages. */
export class GuideRepository implements IGuideRepository {
  constructor(private readonly skillsDir: string) {}

  async topics(): Promise<string[]> {
    const skills = await readdir(this.skillsDir, { withFileTypes: true }).catch(() => []);
    return [...skills.filter((entry) => entry.isDirectory()).map((entry) => entry.name), ...Object.keys(RULE_GUIDES)];
  }

  async read(topic: string): Promise<string | null> {
    if (!TOPIC.test(topic)) return null;
    const rule = RULE_GUIDES[topic as CheckId];
    if (rule) return formatRule(rule);
    return readFile(join(this.skillsDir, topic, 'SKILL.md'), 'utf8').catch(() => null);
  }
}
