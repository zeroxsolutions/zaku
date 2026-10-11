import { FileHeldByAnotherSession } from './errors/index.js';
import { FileLeases, LEASE_IDLE_MS } from './file-leases.js';

const a = { id: 'a', cwd: '/work/a' };
const b = { id: 'b', cwd: '/work/b' };

describe('FileLeases', () => {
  it('gives a file to its first writer and refuses another, naming the holder', () => {
    let t = 0;
    const leases = new FileLeases<string>(() => t);
    leases.write('f', 'Untitled', a);
    expect(() => leases.write('f', 'Untitled', b)).toThrow(FileHeldByAnotherSession);
    expect(() => leases.write('f', 'Untitled', b)).toThrow(/\/work\/a/);
    t = 1000;
    leases.write('f', 'Untitled', a);
    expect(leases.holder('f')?.lastWrite).toBe(1000);
  });

  it('ends a lease when its client leaves, and 15 minutes after its last write', () => {
    let t = 0;
    const leases = new FileLeases<string>(() => t);
    leases.write('f', 'x', a);
    leases.release('a');
    leases.write('f', 'x', b);
    t = LEASE_IDLE_MS + 1;
    expect(leases.holder('f')).toBeNull();
    leases.write('f', 'x', a);
    expect(leases.holder('f')?.client).toEqual(a);
  });

  it('grants a file to the client whose code it paired with', () => {
    const leases = new FileLeases<string>(() => 0);
    leases.grant('f', b);
    expect(() => leases.write('f', 'x', a)).toThrow(FileHeldByAnotherSession);
    leases.write('f', 'x', b);
  });

  it('forgets a file whose connection closed', () => {
    const leases = new FileLeases<string>(() => 0);
    leases.write('f', 'x', a);
    leases.drop('f');
    expect(leases.holder('f')).toBeNull();
  });
});
