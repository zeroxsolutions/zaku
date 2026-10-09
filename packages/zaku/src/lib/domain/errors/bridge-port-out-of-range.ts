/** ZAKU_PORT names a port the Figma plugin's manifest does not admit, so the plugin could never reach it. */
export class BridgePortOutOfRange extends Error {
  /** `range` is the admitted ports as a person reads them, such as `7337-7346`. */
  constructor(value: string, range: string) {
    super(
      `BridgePortOutOfRange: ZAKU_PORT=${value} is not a port the zaku Figma plugin can reach; set a port in ${range}, or unset ZAKU_PORT to take the first free one`,
    );
    this.name = 'BridgePortOutOfRange';
  }
}
