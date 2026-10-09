import {
  fileHelloSchema,
  pluginMessageSchema,
  serverMessageSchema,
  type PluginMessage,
  type RefusalReason,
  type ServerMessage,
} from '@zeroxsolutions/zaku/schema';
import { storedToken, type Connection } from './relay.js';

export type Finding = Extract<ServerMessage, { type: 'findings' }>['findings'][number];

export interface Running {
  command: 'execute' | 'read' | 'check';
  id: string;
  since: number;
}

/** Whether zaku-mcp knows this plugin; checking until the sandbox says whether it kept a token. */
export type Pairing =
  | { phase: 'checking' }
  | { phase: 'unpaired'; refusal: RefusalReason | null }
  | { phase: 'paired' };

/** What the status bar names: not paired outranks whatever the socket is doing, short of nothing answering. */
export type PanelStatus = Connection | { state: 'unpaired' };

/** A throw the sandbox reported; `retry` is the panel's own command that threw, to send again, or null. */
export interface SandboxError {
  message: string;
  retry: object | null;
}

export interface PanelState {
  connection: Connection;
  pairing: Pairing;
  file: string | null;
  running: Running | null;
  /** Null until the first check reports, so a clean page reads apart from one never checked. */
  findings: Finding[] | null;
  error: SandboxError | null;
}

/** What the panel sees: the relay's connection, and the traffic it carries each way. */
export type PanelEvent =
  | { kind: 'connection'; connection: Connection }
  | { kind: 'to-sandbox'; message: unknown; now: number }
  | { kind: 'from-sandbox'; message: unknown }
  /** The user sent a pairing code. */
  | { kind: 'pair' }
  | { kind: 'unpair' }
  /** The user closed the sandbox error, or sent its command again. */
  | { kind: 'dismiss-error' };

export const INITIAL_PANEL_STATE: PanelState = {
  connection: { state: 'idle' },
  pairing: { phase: 'checking' },
  file: null,
  running: null,
  findings: null,
  error: null,
};

function toSandbox(state: PanelState, message: ServerMessage, now: number): PanelState {
  if (message.type === 'run') return { ...state, running: { command: 'execute', id: message.runId, since: now } };
  if (message.type === 'read') return { ...state, running: { command: 'read', id: message.requestId, since: now } };
  if (message.type === 'snapshot')
    return { ...state, running: { command: 'check', id: message.requestId, since: now } };
  if (message.type === 'findings') return { ...state, findings: message.findings };
  if (message.type === 'paired') return { ...state, pairing: { phase: 'paired' } };
  if (message.type === 'refused') return { ...state, pairing: { phase: 'unpaired', refusal: message.reason } };
  // The decision ends the execute here: after a timeout the sandbox may never answer it.
  if (message.type === 'decide' && state.running?.id === message.runId) return { ...state, running: null };
  return state;
}

function fromSandbox(state: PanelState, message: PluginMessage): PanelState {
  const answered =
    message.type === 'settled' || message.type === 'threw'
      ? message.runId
      : message.type === 'read-result'
        ? message.requestId
        : null;
  return answered !== null && state.running?.id === answered ? { ...state, running: null } : state;
}

/** The sandbox's own report of a throw it could not answer through the bridge. */
function sandboxError(message: unknown): SandboxError | null {
  if (typeof message !== 'object' || message === null) return null;
  const { type, error, retry } = message as { type?: unknown; error?: unknown; retry?: unknown };
  if (type !== 'sandbox-error' || typeof error !== 'string') return null;
  return { message: error, retry: typeof retry === 'object' && retry !== null ? retry : null };
}

export function panelReducer(state: PanelState, event: PanelEvent): PanelState {
  if (event.kind === 'dismiss-error') return { ...state, error: null };
  if (event.kind === 'pair') return { ...state, pairing: { phase: 'unpaired', refusal: null } };
  if (event.kind === 'unpair')
    return { ...state, pairing: { phase: 'unpaired', refusal: null }, file: null, findings: null, running: null };
  if (event.kind === 'connection')
    return {
      ...state,
      connection: event.connection,
      running: event.connection.state === 'connected' ? state.running : null,
    };
  if (event.kind === 'to-sandbox') {
    const parsed = serverMessageSchema.safeParse(event.message);
    return parsed.success ? toSandbox(state, parsed.data, event.now) : state;
  }
  const error = sandboxError(event.message);
  if (error !== null) return { ...state, error };
  const token = storedToken(event.message);
  if (token !== undefined)
    return { ...state, pairing: token === null ? { phase: 'unpaired', refusal: null } : { phase: 'paired' } };
  // The sandbox's hello carries no credential; the relay adds it on the way to the server.
  const hello = fileHelloSchema.safeParse(event.message);
  if (hello.success) return { ...state, file: hello.data.file, error: null };
  const parsed = pluginMessageSchema.safeParse(event.message);
  return parsed.success ? fromSandbox(state, parsed.data) : state;
}

/** A code that reaches no server leaves the panel unpaired, and the Port field it needs comes with not connected. */
export function panelStatus(state: PanelState): PanelStatus {
  return state.pairing.phase === 'unpaired' && state.connection.state !== 'disconnected'
    ? { state: 'unpaired' }
    : state.connection;
}
