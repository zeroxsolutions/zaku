import WebSocket from 'ws';
import type { NodeSnapshot, PluginMessage, ServerMessage } from '../../lib/schema/bridge.js';

export type Behaviour = (message: ServerMessage, send: (m: PluginMessage) => void, socket: WebSocket) => void;

/** A plugin that dials the server, says hello and answers each message as the behaviour says. */
export async function fakePlugin(
  port: number,
  file: string,
  behaviour: Behaviour,
  origin?: string,
): Promise<WebSocket> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`, origin ? { origin } : {});
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  const send = (message: PluginMessage): void => socket.send(JSON.stringify(message));
  socket.on('message', (data) => behaviour(JSON.parse(String(data)) as ServerMessage, send, socket));
  send({
    type: 'hello',
    file,
    pages: [{ id: '0:1', name: 'Page 1' }],
    currentPage: '0:1',
    selection: [],
    pluginVersion: '0.1.0',
    user: null,
  });
  return socket;
}

export const unboundCard: NodeSnapshot = {
  id: '1:1',
  name: 'Card',
  type: 'FRAME',
  parentId: '0:1',
  created: true,
  fills: [{ bound: false }],
  strokes: [],
  textStyleId: null,
  instance: null,
  spacing: [],
};

/** Answers every run with the given snapshot, and settles each decision as asked. */
export function obedient(snapshot: NodeSnapshot[], log: ServerMessage[] = []): Behaviour {
  return (message, send) => {
    log.push(message);
    if (message.type === 'run')
      send({
        type: 'ran',
        runId: message.runId,
        ok: true,
        value: 'v',
        created: snapshot.map((n) => n.id),
        mutated: [],
        snapshot,
      });
    if (message.type === 'decide')
      send({
        type: 'settled',
        runId: message.runId,
        outcome: message.decision === 'commit' ? 'committed' : 'rolled-back',
        untouchable: [],
      });
    if (message.type === 'read') send({ type: 'read-result', requestId: message.requestId, nodes: [] });
    if (message.type === 'snapshot') send({ type: 'read-result', requestId: message.requestId, snapshot });
  };
}
