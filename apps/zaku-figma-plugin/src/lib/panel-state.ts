import {
  pluginMessageSchema,
  serverMessageSchema,
  type PluginMessage,
  type ServerMessage,
} from '@zeroxsolutions/zaku/schema';
import type { RelayStatus } from './relay.js';

export type Finding = Extract<ServerMessage, { type: 'findings' }>['findings'][number];

export interface Running {
  command: 'execute' | 'read' | 'check';
  id: string;
  since: number;
}

export interface PanelState {
  status: RelayStatus;
  file: string | null;
  running: Running | null;
  findings: Finding[];
  error: string | null;
}

/** What the panel sees: the relay's status, and the traffic it carries each way. */
export type PanelEvent =
  | { kind: 'status'; status: RelayStatus }
  | { kind: 'to-sandbox'; message: unknown; now: number }
  | { kind: 'from-sandbox'; message: unknown };

export const INITIAL_PANEL_STATE: PanelState = {
  status: 'disconnected',
  file: null,
  running: null,
  findings: [],
  error: null,
};

function toSandbox(state: PanelState, message: ServerMessage, now: number): PanelState {
  if (message.type === 'run') return { ...state, running: { command: 'execute', id: message.runId, since: now } };
  if (message.type === 'read') return { ...state, running: { command: 'read', id: message.requestId, since: now } };
  if (message.type === 'snapshot')
    return { ...state, running: { command: 'check', id: message.requestId, since: now } };
  if (message.type === 'findings') return { ...state, findings: message.findings };
  // The decision ends the execute here: after a timeout the sandbox may never answer it.
  if (message.type === 'decide' && state.running?.id === message.runId) return { ...state, running: null };
  return state;
}

function fromSandbox(state: PanelState, message: PluginMessage): PanelState {
  if (message.type === 'hello') return { ...state, file: message.file, error: null };
  const answered =
    message.type === 'settled' || message.type === 'threw'
      ? message.runId
      : message.type === 'read-result'
        ? message.requestId
        : null;
  return answered !== null && state.running?.id === answered ? { ...state, running: null } : state;
}

/** The sandbox's own report of a throw it could not answer through the bridge. */
function sandboxError(message: unknown): string | null {
  if (typeof message !== 'object' || message === null) return null;
  const { type, error } = message as { type?: unknown; error?: unknown };
  return type === 'sandbox-error' && typeof error === 'string' ? error : null;
}

export function panelReducer(state: PanelState, event: PanelEvent): PanelState {
  if (event.kind === 'status')
    return { ...state, status: event.status, running: event.status === 'connected' ? state.running : null };
  if (event.kind === 'to-sandbox') {
    const parsed = serverMessageSchema.safeParse(event.message);
    return parsed.success ? toSandbox(state, parsed.data, event.now) : state;
  }
  const error = sandboxError(event.message);
  if (error !== null) return { ...state, error };
  const parsed = pluginMessageSchema.safeParse(event.message);
  return parsed.success ? fromSandbox(state, parsed.data) : state;
}
