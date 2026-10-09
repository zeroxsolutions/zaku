import { startRelay, type SocketLike } from './relay.js';

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: string[] = [];
  readyState = 0;
  send(data: string): void {
    this.sent.push(data);
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

describe('the relay', () => {
  it('announces the connection, and forwards both ways', () => {
    const sockets: FakeSocket[] = [];
    const toSandbox: unknown[] = [];
    let fromSandbox: (m: unknown) => void = () => undefined;
    startRelay({
      url: 'ws://localhost:7337',
      post: (m) => toSandbox.push(m),
      listen: (cb) => (fromSandbox = cb),
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: () => undefined,
      onStatus: () => undefined,
    });
    sockets[0]?.open();
    expect(toSandbox).toEqual([{ type: 'connected' }]);
    sockets[0]?.onmessage?.({ data: '{"type":"select","nodeId":"1:1"}' });
    expect(toSandbox.at(-1)).toEqual({ type: 'select', nodeId: '1:1' });
    fromSandbox({ type: 'state', currentPage: '0:1', selection: [] });
    expect(sockets[0]?.sent).toEqual(['{"type":"state","currentPage":"0:1","selection":[]}']);
  });

  it('redials with a growing delay after a drop', () => {
    const delays: number[] = [];
    const sockets: FakeSocket[] = [];
    let later: () => void = () => undefined;
    startRelay({
      url: 'ws://localhost:7337',
      post: () => undefined,
      listen: () => undefined,
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: (fn, ms) => {
        delays.push(ms);
        later = fn;
      },
      onStatus: () => undefined,
    });
    sockets[0]?.drop();
    later();
    sockets[1]?.drop();
    later();
    expect(delays).toEqual([500, 1000]);
    expect(sockets).toHaveLength(3);
  });

  it('drops a sandbox message while the socket is closed', () => {
    const sockets: FakeSocket[] = [];
    let fromSandbox: (m: unknown) => void = () => undefined;
    startRelay({
      url: 'ws://localhost:7337',
      post: () => undefined,
      listen: (cb) => (fromSandbox = cb),
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: () => undefined,
      onStatus: () => undefined,
    });
    fromSandbox({ type: 'state', currentPage: '0:1', selection: [] });
    expect(sockets[0]?.sent).toEqual([]);
  });

  it('reports disconnected, then connected, then reconnecting, then disconnected at the cap', () => {
    const sockets: FakeSocket[] = [];
    const statuses: string[] = [];
    const due: (() => void)[] = [];
    startRelay({
      url: 'ws://localhost:7337',
      post: () => undefined,
      listen: () => undefined,
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: (fn) => due.push(fn),
      onStatus: (status) => statuses.push(status),
    });
    sockets[0]?.open();
    sockets[0]?.drop();
    for (let i = 0; i < 6; i++) {
      due.shift()?.();
      sockets.at(-1)?.drop();
    }
    expect(statuses.slice(0, 3)).toEqual(['disconnected', 'connected', 'reconnecting']);
    expect(statuses.at(-1)).toBe('disconnected');
  });

  it('sends the own message of the panel to the server only while connected', () => {
    const sockets: FakeSocket[] = [];
    const relay = startRelay({
      url: 'ws://localhost:7337',
      post: () => undefined,
      listen: () => undefined,
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: () => undefined,
      onStatus: () => undefined,
    });
    relay.send({ type: 'check', scope: { page: true } });
    sockets[0]?.open();
    relay.send({ type: 'check', scope: { page: true } });
    expect(sockets[0]?.sent).toEqual(['{"type":"check","scope":{"page":true}}']);
  });

  it('stays disconnected while zaku-mcp has never answered', () => {
    const sockets: FakeSocket[] = [];
    const statuses: string[] = [];
    const due: (() => void)[] = [];
    startRelay({
      url: 'ws://localhost:7337',
      post: () => undefined,
      listen: () => undefined,
      open: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
      schedule: (fn) => due.push(fn),
      onStatus: (status) => statuses.push(status),
    });
    for (let i = 0; i < 3; i++) {
      sockets.at(-1)?.drop();
      due.shift()?.();
    }
    expect(new Set(statuses)).toEqual(new Set(['disconnected']));
  });
});
