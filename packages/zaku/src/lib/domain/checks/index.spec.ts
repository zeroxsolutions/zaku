import { testInput, testLibrary, testTokens } from '../../../test/fixtures.fixture.js';
import { ALL_CHECKS } from './index.js';

describe('ALL_CHECKS', () => {
  it('registers only checks that run once their inputs exist, so a clean design exits 0', () => {
    const input = testInput({
      library: testLibrary(),
      tokens: testTokens({}),
      recipe: { shadcn: '4.21.3', style: 'nova', components: [] } as never,
    });
    const notRun = Object.entries(ALL_CHECKS).flatMap(([id, check]) => {
      const outcome = check(input);
      return 'notRun' in outcome ? [`${id}: ${outcome.notRun}`] : [];
    });
    expect(notRun).toEqual([]);
  });
});
