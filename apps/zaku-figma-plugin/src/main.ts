import { PLUGIN_VERSION, serverMessageSchema, type FileHello, type PluginMessage } from '@zeroxsolutions/zaku/schema';
import { findByPath } from './sandbox/find.js';
import { outlineNode } from './sandbox/outline.js';
import { createRunner } from './sandbox/runner.js';
import { snapshotNode } from './sandbox/snapshot.js';

figma.showUI(__html__, { width: 320, height: 480, themeColors: true });
const post = (message: PluginMessage | FileHello): void => figma.ui.postMessage(message);

/** The clientStorage key of the token zaku-mcp issued when the user paired this plugin. */
const TOKEN_KEY = 'zaku-token';
/** The clientStorage key of the port the panel last connected on, which it dials first when it opens. */
const PORT_KEY = 'zaku-port';

const resolveVariable = async (id: string): Promise<string | null> =>
  (await figma.variables.getVariableByIdAsync(id))?.name ?? null;

const zaku = {
  page: (name: string): PageNode | null => figma.root.children.find((page) => page.name === name) ?? null,
  find: (path: string): SceneNode | null => findByPath(figma.currentPage, path),
  instance: async (key: string): Promise<InstanceNode> => (await figma.importComponentByKeyAsync(key)).createInstance(),
  font: (family: string, style: string): Promise<void> => figma.loadFontAsync({ family, style }),
  bind: async (
    node: MinimalFillsMixin & MinimalStrokesMixin,
    field: 'fills' | 'strokes',
    name: string,
  ): Promise<void> => {
    const local = (await figma.variables.getLocalVariablesAsync('COLOR')).find((v) => v.name === name);
    let variable = local ?? null;
    if (!variable) {
      for (const collection of await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()) {
        const found = (await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key)).find(
          (v) => v.name === name,
        );
        if (found) {
          variable = await figma.variables.importVariableByKeyAsync(found.key);
          break;
        }
      }
    }
    if (!variable) throw new Error(`no colour variable named ${name}`);
    const paints = [...(node[field] as Paint[])];
    const first = paints.findIndex((paint) => paint.type === 'SOLID');
    if (first < 0) throw new Error(`${field} holds no solid paint to bind`);
    paints[first] = figma.variables.setBoundVariableForPaint(paints[first] as SolidPaint, 'color', variable);
    node[field] = paints as never;
  },
};

const runner = createRunner(
  {
    figma,
    snapshot: (node, created) => snapshotNode(node as unknown as SceneNode, created),
    holdTimer: { set: (fn, ms) => setTimeout(fn, ms), clear: (handle) => clearTimeout(handle as number) },
    helper: zaku,
  },
  post,
);

async function scopeNodes(scope: { page: true } | { nodeId: string } | { all: true }): Promise<SceneNode[]> {
  if ('nodeId' in scope) {
    const node = await figma.getNodeByIdAsync(scope.nodeId);
    if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') return [];
    const scene = node as SceneNode;
    return 'findAll' in scene ? [scene, ...(scene as FrameNode).findAll()] : [scene];
  }
  if ('all' in scope) {
    await figma.loadAllPagesAsync();
    return figma.root.children.flatMap((page) => page.findAll());
  }
  return figma.currentPage.findAll();
}

/** The panel's own commands; one that threw goes back with the error, so the panel can send it again. */
const PANEL_COMMANDS: readonly unknown[] = ['select', 'resize', 'read-token', 'forget-token'];

figma.ui.onmessage = async (raw: unknown): Promise<void> => {
  try {
    await receive(raw);
  } catch (error) {
    // A throw here is otherwise silent; the panel shows it, and the server ignores a type it does not know.
    const type = raw && typeof raw === 'object' ? (raw as { type?: unknown }).type : undefined;
    figma.ui.postMessage({
      type: 'sandbox-error',
      error: String(error),
      ...(PANEL_COMMANDS.includes(type) ? { retry: raw } : {}),
    });
  }
};

/** The smallest panel that still shows the status bar and a finding. */
const MIN_PANEL_SIZE = 240;

async function receive(raw: unknown): Promise<void> {
  const type = raw && typeof raw === 'object' ? (raw as { type?: unknown }).type : undefined;
  if (type === 'connected') {
    const { port } = raw as { port?: unknown };
    if (typeof port === 'number') await figma.clientStorage.setAsync(PORT_KEY, port);
    return sayHello();
  }
  // The panel cannot reach clientStorage, and its own localStorage is blocked in Figma's sandboxed iframe.
  if (type === 'read-token') {
    const token: unknown = await figma.clientStorage.getAsync(TOKEN_KEY);
    const port: unknown = await figma.clientStorage.getAsync(PORT_KEY);
    figma.ui.postMessage({
      type: 'stored-token',
      token: typeof token === 'string' ? token : null,
      port: typeof port === 'number' ? port : null,
    });
    return;
  }
  if (type === 'forget-token') return figma.clientStorage.deleteAsync(TOKEN_KEY);
  if (raw && typeof raw === 'object' && (raw as { type?: string }).type === 'resize') {
    const { width, height } = raw as { width: number; height: number };
    return figma.ui.resize(Math.max(MIN_PANEL_SIZE, width), Math.max(MIN_PANEL_SIZE, height));
  }
  const parsed = serverMessageSchema.safeParse(raw);
  if (!parsed.success) return;
  const message = parsed.data;
  // A refused token is kept: the zaku-mcp that refused it may be a test run's, while the user's own one, which
  // knows it, is down or on another port. Only Unpair, or the token a new pairing hands back, replaces it.
  if (message.type === 'paired') return figma.clientStorage.setAsync(TOKEN_KEY, message.token);
  if (message.type === 'run' || message.type === 'decide') return runner.receive(message);
  if (message.type === 'select') {
    const node = await figma.getNodeByIdAsync(message.nodeId);
    if (node && 'type' in node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
      figma.currentPage.selection = [node as SceneNode];
      figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    }
    return;
  }
  if (message.type === 'read' || message.type === 'snapshot') {
    try {
      if (message.type === 'read') {
        const target =
          'nodeId' in message.target
            ? await figma.getNodeByIdAsync(message.target.nodeId)
            : findByPath(figma.currentPage, message.target.path);
        const nodes =
          target && target.type !== 'DOCUMENT'
            ? [await outlineNode(target as SceneNode, message.depth, resolveVariable)]
            : [];
        post({ type: 'read-result', requestId: message.requestId, nodes });
      } else {
        const nodes = await scopeNodes(message.scope);
        const snapshot = await Promise.all(nodes.map((node) => snapshotNode(node, false)));
        post({ type: 'read-result', requestId: message.requestId, snapshot });
      }
    } catch (error) {
      post({ type: 'read-result', requestId: message.requestId, error: String(error) });
    }
  }
  // `findings` is for the panel, which reads it off the relay; the sandbox has nothing to do with it.
}

function sayHello(): void {
  post({
    type: 'hello',
    file: figma.root.name,
    pages: figma.root.children.map((page) => ({ id: page.id, name: page.name })),
    currentPage: figma.currentPage.id,
    selection: figma.currentPage.selection.map((node) => node.id),
    pluginVersion: PLUGIN_VERSION,
    user: figma.currentUser?.name ?? null,
  });
}

const sendState = (): void =>
  post({
    type: 'state',
    currentPage: figma.currentPage.id,
    selection: figma.currentPage.selection.map((node) => node.id),
  });
figma.on('selectionchange', sendState);
figma.on('currentpagechange', sendState);
