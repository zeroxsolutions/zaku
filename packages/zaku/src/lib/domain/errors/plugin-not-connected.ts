/** No zaku plugin is open in any Figma file. */
export class PluginNotConnected extends Error {
  constructor() {
    super('PluginNotConnected: open zaku in Figma (Plugins > zaku)');
    this.name = 'PluginNotConnected';
  }
}
