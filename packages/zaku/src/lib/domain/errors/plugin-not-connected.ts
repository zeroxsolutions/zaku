/** No paired zaku plugin is connected from any Figma file. */
export class PluginNotConnected extends Error {
  constructor() {
    super(
      'PluginNotConnected: open zaku in Figma (Plugins > zaku); if its panel says Not paired, call issue_pairing_code and have the user type the code into it; if it says Not connected, have the user enter the port get_bridge_state reports',
    );
    this.name = 'PluginNotConnected';
  }
}
