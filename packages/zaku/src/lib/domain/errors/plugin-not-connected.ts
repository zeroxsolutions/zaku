/** No paired zaku plugin is connected from any Figma file. */
export class PluginNotConnected extends Error {
  constructor() {
    super(
      'PluginNotConnected: open zaku in Figma (Plugins > zaku); if its panel says Not paired, call pair and have the user type the code into it',
    );
    this.name = 'PluginNotConnected';
  }
}
