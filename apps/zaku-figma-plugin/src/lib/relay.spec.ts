import { startRelay, type Relay, type SocketLike } from './relay.js';

class FakeSocket implements SocketLike {
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
} {
  const sockets: FakeSocket[] = [];
  const toSandbox: unknown[] = [];
  const due: (() => void)[] = [];
  const delays: number[] = [];
  const statuses: string[] = [];
  let fromSandbox: (m: unknown) => void = () => undefined;
  const relay = startRelay({
    url: 'ws://localhost:7337',
    post: (m) => toSandbox.push(m),
    listen: (cb) => (fromSandbox = cb),
    open: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    schedule: (fn, ms) => {
      due.push(fn);
      delays.push(ms);
    },
    onStatus: (status) => statuses.push(status),
  });
  return { relay, sockets, toSandbox, fromSandbox: (m) => fromSandbox(m), due, delays, statuses };
}

const sent = (socket: FakeSocket | undefined): unknown[] => (socket?.sent ?? []).map((data) => JSON.parse(data));

describe('the relay', () => {
  it('dials nothing while the plugin holds no credential', () => {
    const { sockets, fromSandbox, statuses } = relayed();
    fromSandbox({ type: 'stored-token', token: null });
    expect(sockets).toEqual([]);
    expect(statuses).toEqual(['disconnected']);
  });

  it('dials with the stored token, and puts it on the sandbox hello', () => {
    const { sockets, toSandbox, fromSandbox } = relayed();
    fromSandbox({ type: 'stored-token', token: 't1' });
    sockets[0]?.open();
    expect(toSandbox).toEqual([{ type: 'connected' }]);
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
    fromSandbox({ type: 'stored-token', token: 't1' });
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
    expect(toSandbox).toEqual([{ type: 'connected' }]);
    sockets[0]?.onmessage?.({ data: '{"type":"select","nodeId":"1:1"}' });
    expect(toSandbox.at(-1)).toEqual({ type: 'select', nodeId: '1:1' });
    fromSandbox({ type: 'state', currentPage: '0:1', selection: [] });
    expect(sockets[0]?.sent).toEqual(['{"type":"state","currentPage":"0:1","selection":[]}']);
  });

  it('redials with a growing delay after a drop', () => {
    const { relay, sockets, due, delays } = relayed();
    relay.pair('12345678');
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
    expect(statuses.slice(0, 3)).toEqual(['disconnected', 'connected', 'reconnecting']);
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

  it('stays disconnected while zaku-mcp has never answered', () => {
    const { relay, sockets, due, statuses } = relayed();
    relay.pair('12345678');
    for (let i = 0; i < 3; i++) {
      sockets.at(-1)?.drop();
      due.shift()?.();
    }
    expect(new Set(statuses)).toEqual(new Set(['disconnected']));
  });
});
