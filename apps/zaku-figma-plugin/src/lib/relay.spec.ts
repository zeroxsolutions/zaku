import { startRelay, type Connection, type Relay, type SocketLike } from './relay.js';

class FakeSocket implements SocketLike {
  constructor(readonly url: string) {}
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  readyState = 0;
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.drop();
  }
  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }
  drop(): void {
    this.readyState = 3;
    this.onclose?.();
  }
}

const sandboxHello = {
  type: 'hello',
  file: 'Acme',
  pages: [],
  currentPage: '0:1',
  selection: [],
  pluginVersion: '0.1.0',
  user: null,
};

/** A relay over fake sockets; `fromSandbox` is the sandbox's side of the message channel. */
function relayed(): {
  relay: Relay;
  sockets: FakeSocket[];
  toSandbox: unknown[];
  fromSandbox: (message: unknown) => void;
  due: (() => void)[];
  delays: number[];
  statuses: string[];
  connections: Connection[];
  urls: () => string[];
} {
  const sockets: FakeSocket[] = [];
  const toSandbox: unknown[] = [];
  const due: (() => void)[] = [];
  const delays: number[] = [];
  const connections: Connection[] = [];
  const statuses: string[] = [];
  let fromSandbox: (m: unknown) => void = () => undefined;
  const relay = startRelay({
    ports: [7337, 7338, 7339],
    post: (m) => toSandbox.push(m),
    listen: (cb) => (fromSandbox = cb),
    open: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    schedule: (fn, ms) => {
      due.push(fn);
      delays.push(ms);
    },
    onConnection: (connection) => {
      connections.push(connection);
      statuses.push(connection.state);
    },
  });
  return {
    relay,
    sockets,
    toSandbox,
    fromSandbox: (m) => fromSandbox(m),
    due,
    delays,
    statuses,
    connections,
    urls: () => sockets.map((socket) => socket.url),
  };
}

const sent = (socket: FakeSocket | undefined): unknown[] => (socket?.sent ?? []).map((data) => JSON.parse(data));

describe('the relay', () => {
  it('dials nothing while the plugin holds no credential', () => {
    const { sockets, fromSandbox, statuses } = relayed();
    fromSandbox({ type: 'stored-token', token: null, port: null });
    expect(sockets).toEqual([]);
    expect(statuses).toEqual(['idle']);
  });

  it('dials with the stored token, and puts it on the sandbox hello', () => {
    const { sockets, toSandbox, fromSandbox } = relayed();
    fromSandbox({ type: 'stored-token', token: 't1', port: null });
    sockets[0]?.open();
    expect(toSandbox).toEqual([{ type: 'connected', port: 7337 }]);
    fromSandbox(sandboxHello);
    expect(sent(sockets[0])).toEqual([{ ...sandboxHello, credential: { token: 't1' } }]);
  });

  it('pairs with a code, then presents the token the server hands back on the next dial', () => {
    const { relay, sockets, fromSandbox, due } = relayed();
    relay.pair('12345678');
    sockets[0]?.open();
    fromSandbox(sandboxHello);
    expect(sent(sockets[0])).toEqual([{ ...sandboxHello, credential: { code: '12345678' } }]);
    sockets[0]?.onmessage?.({ data: '{"type":"paired","token":"t2"}' });
    sockets[0]?.drop();
    due.shift()?.();
    sockets[1]?.open();
    fromSandbox(sandboxHello);
    expect(sent(sockets[1])).toEqual([{ ...sandboxHello, credential: { token: 't2' } }]);
  });

  it('stops dialing once the server refuses the credential', () => {
    const { relay, sockets, due, toSandbox } = relayed();
    relay.pair('00000000');
    sockets[0]?.open();
    sockets[0]?.onmessage?.({ data: '{"type":"refused","reason":"wrong-code"}' });
    sockets[0]?.drop();
    expect(toSandbox.at(-1)).toEqual({ type: 'refused', reason: 'wrong-code' });
    expect(due).toEqual([]);
  });

  it('tells the server to unpair, closes the socket, and stops dialing', () => {
    const { relay, sockets, fromSandbox, due } = relayed();
    fromSandbox({ type: 'stored-token', token: 't1', port: null });
    sockets[0]?.open();
    relay.unpair();
    expect(sent(sockets[0])).toEqual([{ type: 'unpair' }]);
    expect(sockets[0]?.readyState).toBe(3);
    expect(due).toEqual([]);
  });

  it('drops a sandbox hello once the credential was refused', () => {
    const { relay, sockets, fromSandbox } = relayed();
    relay.pair('12345678');
    sockets[0]?.open();
    sockets[0]?.onmessage?.({ data: '{"type":"refused","reason":"expired-code"}' });
    fromSandbox(sandboxHello);
    expect(sent(sockets[0])).toEqual([]);
  });

  it('announces the connection, and forwards both ways', () => {
    const { relay, sockets, toSandbox, fromSandbox } = relayed();
    relay.pair('12345678');
    sockets[0]?.open();
    expect(toSandbox).toEqual([{ type: 'connected', port: 7337 }]);
    sockets[0]?.onmessage?.({ data: '{"type":"select","nodeId":"1:1"}' });
    expect(toSandbox.at(-1)).toEqual({ type: 'select', nodeId: '1:1' });
    fromSandbox({ type: 'state', currentPage: '0:1', selection: [] });
    expect(sockets[0]?.sent).toEqual(['{"type":"state","currentPage":"0:1","selection":[]}']);
  });

  it('redials with a growing delay after a drop', () => {
    const { relay, sockets, due, delays } = relayed();
    relay.pair('12345678');
    sockets[0]?.open();
    sockets[0]?.drop();
    due.shift()?.();
    sockets[1]?.drop();
    due.shift()?.();
    expect(delays).toEqual([500, 1000]);
    expect(sockets).toHaveLength(3);
  });

  it('drops a sandbox message while the socket is closed', () => {
    const { relay, sockets, fromSandbox } = relayed();
    relay.pair('12345678');
    fromSandbox({ type: 'state', currentPage: '0:1', selection: [] });
    expect(sockets[0]?.sent).toEqual([]);
  });

  it('reports disconnected, then connected, then reconnecting, then disconnected at the cap', () => {
    const { relay, sockets, due, statuses } = relayed();
    relay.pair('12345678');
    sockets[0]?.open();
    sockets[0]?.drop();
    for (let i = 0; i < 6; i++) {
      due.shift()?.();
      sockets.at(-1)?.drop();
    }
    expect(statuses.slice(0, 3)).toEqual(['idle', 'connected', 'reconnecting']);
    expect(statuses.at(-1)).toBe('disconnected');
  });

  it("sends the panel's own message to the server only while connected", () => {
    const { relay, sockets } = relayed();
    relay.pair('12345678');
    relay.send({ type: 'check', scope: { page: true } });
    sockets[0]?.open();
    relay.send({ type: 'check', scope: { page: true } });
    expect(sockets[0]?.sent).toEqual(['{"type":"check","scope":{"page":true}}']);
  });

  it('says disconnected, and never reconnecting, while zaku-mcp has never answered', () => {
    const { relay, sockets, due, statuses } = relayed();
    relay.pair('12345678');
    for (let i = 0; i < 6; i++) {
      sockets.at(-1)?.drop();
      due.shift()?.();
    }
    expect(new Set(statuses)).toEqual(new Set(['idle', 'disconnected']));
  });

  it('dials the port it last connected on, then scans the rest of the range once', () => {
    const { fromSandbox, sockets, due, connections, urls } = relayed();
    fromSandbox({ type: 'stored-token', token: 't1', port: 7338 });
    for (let i = 0; i < 3; i++) sockets.at(-1)?.drop();
    expect(urls()).toEqual(['ws://localhost:7338', 'ws://localhost:7337', 'ws://localhost:7339']);
    expect(connections.at(-1)).toEqual({ state: 'disconnected', port: 7338 });
    due.shift()?.();
    sockets.at(-1)?.drop();
    due.shift()?.();
    expect(urls().slice(3)).toEqual(['ws://localhost:7338', 'ws://localhost:7338']);
  });

  it('connects on a port the scan found, says which, and dials it after a drop', () => {
    const { relay, sockets, due, toSandbox, connections, urls } = relayed();
    relay.pair('12345678');
    sockets[0]?.drop();
    sockets[1]?.open();
    expect(connections.at(-1)).toEqual({ state: 'connected', port: 7338 });
    expect(toSandbox).toEqual([{ type: 'connected', port: 7338 }]);
    sockets[1]?.drop();
    due.shift()?.();
    expect(urls().at(-1)).toBe('ws://localhost:7338');
  });

  it('ignores a stored port outside the range', () => {
    const { fromSandbox, urls } = relayed();
    fromSandbox({ type: 'stored-token', token: 't1', port: 9000 });
    expect(urls()[0]).toBe('ws://localhost:7337');
  });

  it('dials the port the user asks for at once, and redials that port from then on', () => {
    const { relay, sockets, due, connections, urls } = relayed();
    relay.pair('12345678');
    for (let i = 0; i < 3; i++) sockets.at(-1)?.drop();
    relay.connect(7339);
    expect(urls().at(-1)).toBe('ws://localhost:7339');
    sockets.at(-1)?.drop();
    expect(connections.at(-1)).toEqual({ state: 'disconnected', port: 7339 });
    due.at(-1)?.();
    expect(urls().at(-1)).toBe('ws://localhost:7339');
    sockets.at(-1)?.open();
    expect(connections.at(-1)).toEqual({ state: 'connected', port: 7339 });
  });

  it('dials nothing when asked for a port while it holds no credential', () => {
    const { relay, sockets } = relayed();
    relay.connect(7339);
    expect(sockets).toEqual([]);
  });

  it('sends the next code to the port the user chose alone, with no scan', () => {
    const { relay, sockets, due, urls } = relayed();
    relay.connect(7339);
    relay.pair('12345678');
    expect(urls()).toEqual(['ws://localhost:7339']);
    sockets[0]?.drop();
    expect(urls()).toEqual(['ws://localhost:7339']);
    due.shift()?.();
    expect(urls()).toEqual(['ws://localhost:7339', 'ws://localhost:7339']);
  });
});
