/**
 * Stands in for a seam this entrypoint never wires: every handler is built at bootstrap, so each
 * token needs a value, and a call through this one says which seam the entrypoint lacks.
 */
export function unavailable<T extends object>(what: string): T {
  return new Proxy({} as T, {
    get: (_target, property): (() => never) | undefined => {
      // `then` is read by `await`; answering it would make the stand-in look like a promise.
      if (property === 'then') return undefined;
      return (): never => {
        throw new Error(`${what} is not available in this entrypoint`);
      };
    },
  });
}
