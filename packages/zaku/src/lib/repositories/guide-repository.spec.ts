import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GuideRepository } from './guide-repository.js';

async function skills(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'zaku-skills-'));
  await mkdir(join(dir, 'drawing-a-screen'));
  await writeFile(join(dir, 'drawing-a-screen', 'SKILL.md'), '# Drawing a screen\n');
  return dir;
}

describe('GuideRepository', () => {
  it('lists every skill and every rule as a topic', async () => {
    const topics = await new GuideRepository(await skills()).topics();
    expect(topics).toEqual(expect.arrayContaining(['drawing-a-screen', 'binding', 'overrides', 'naming']));
  });

  it('reads a skill', async () => {
    expect(await new GuideRepository(await skills()).read('drawing-a-screen')).toBe('# Drawing a screen\n');
  });

  it('reads a rule', async () => {
    expect(await new GuideRepository(await skills()).read('binding')).toContain('Why');
  });

  it('answers null for a topic it does not have, and never leaves the skills directory', async () => {
    const repo = new GuideRepository(await skills());
    expect(await repo.read('nope')).toBeNull();
    expect(await repo.read('../../etc')).toBeNull();
  });
});
