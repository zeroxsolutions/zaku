import { BRIDGE_PORT } from '@zeroxsolutions/zaku/schema';
import { useEffect, useReducer, useRef, useState } from 'react';
import { INITIAL_PANEL_STATE, panelReducer, type PanelState } from '@/lib/panel-state';
import { startRelay, type Relay, type SocketLike } from '@/lib/relay';

interface Panel {
  state: PanelState;
  /** The clock the running command's time is read against; ticks only while something runs. */
  now: number;
  checkAgain(): void;
  select(nodeId: string): void;
  resize(width: number, height: number): void;
}

const toSandbox = (message: unknown): void => window.parent.postMessage({ pluginMessage: message }, '*');

/** Starts the relay between the sandbox and zaku-mcp, and reads what it carries into the panel's state. */
export function usePanel(): Panel {
  const [state, dispatch] = useReducer(panelReducer, INITIAL_PANEL_STATE);
  const [now, setNow] = useState(() => Date.now());
  const relay = useRef<Relay | null>(null);

  useEffect(() => {
    // StrictMode runs this effect twice in development; a second relay would dial a second socket.
    if (relay.current !== null) return;
    relay.current = startRelay({
      url: `ws://localhost:${BRIDGE_PORT}`,
      post: (message) => {
        dispatch({ kind: 'to-sandbox', message, now: Date.now() });
        toSandbox(message);
      },
      listen: (callback) =>
        window.addEventListener('message', (event: MessageEvent) => {
          const message = (event.data as { pluginMessage?: unknown } | null)?.pluginMessage;
          if (message === undefined) return;
          dispatch({ kind: 'from-sandbox', message });
          callback(message);
        }),
      open: (url) => new WebSocket(url) as unknown as SocketLike,
      schedule: (fn, ms) => window.setTimeout(fn, ms),
      onStatus: (status) => dispatch({ kind: 'status', status }),
    });
  }, []);

  useEffect(() => {
    if (state.running === null) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return (): void => window.clearInterval(timer);
  }, [state.running]);

  return {
    state,
    now,
    checkAgain: () => relay.current?.send({ type: 'check', scope: { page: true } }),
    select: (nodeId) => toSandbox({ type: 'select', nodeId }),
    resize: (width, height) => toSandbox({ type: 'resize', width, height }),
  };
}
