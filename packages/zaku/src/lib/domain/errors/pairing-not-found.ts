/** `revoke_pairing` named an id no stored pairing has. */
export class PairingNotFound extends Error {
  constructor(
    readonly id: string,
    readonly ids: readonly string[],
  ) {
    super(`PairingNotFound: no pairing has the id ${id}; stored: ${ids.join(', ') || 'none'}`);
    this.name = 'PairingNotFound';
  }
}
