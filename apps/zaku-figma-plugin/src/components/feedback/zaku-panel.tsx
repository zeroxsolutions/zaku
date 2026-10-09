import { BRIDGE_PORT_RANGE, BRIDGE_PORTS } from '@zeroxsolutions/zaku/schema';
import { FindingsEmpty } from '@/components/data-display/findings-empty';
import { FindingsList } from '@/components/data-display/findings-list';
import { PairingForm } from '@/components/data-entry/pairing-form';
import { PortForm } from '@/components/data-entry/port-form';
import { StatusBar } from '@/components/feedback/status-bar';
import { CheckBar } from '@/components/general/check-bar';
import { ResizeHandle } from '@/components/general/resize-handle';
import { Button } from '@/components/ui/button';
import type { Panel } from '@/hooks/use-panel';
import { panelStatus } from '@/lib/panel-state';
import { cn } from '@/lib/utils';

type ZakuPanelProps = Panel & Omit<React.ComponentProps<'div'>, 'onSelect' | 'onResize'>;

/**
 * The whole panel over its state: the status bar, then the Port field while nothing answers, the pairing code
 * while unpaired, or the findings.
 */
function ZakuPanel({
  state,
  now,
  checkAgain,
  pair,
  connect,
  unpair,
  select,
  resize,
  className,
  ...props
}: ZakuPanelProps): React.JSX.Element {
  const status = panelStatus(state);
  const connected = status.state === 'connected';
  const canCheck = connected && state.file !== null && state.running === null;
  return (
    <div data-slot="zaku-panel" className={cn('flex h-screen flex-col', className)} {...props}>
      <StatusBar status={status} file={state.file} running={state.running} now={now}>
        {state.pairing.phase === 'paired' && (
          <Button variant="ghost" size="xs" onClick={unpair}>
            Unpair
          </Button>
        )}
      </StatusBar>
      {state.error !== null && (
        <p role="alert" className="text-error border-b px-3 py-2 text-xs">
          {state.error}
        </p>
      )}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {state.connection.state === 'disconnected' ? (
          <PortForm key={state.connection.port} port={state.connection.port} ports={BRIDGE_PORTS} onConnect={connect} />
        ) : state.pairing.phase === 'unpaired' ? (
          <PairingForm refusal={state.pairing.refusal} onPair={pair} />
        ) : connected && state.findings !== null && state.findings.length > 0 ? (
          <FindingsList findings={state.findings} onSelectNode={select} />
        ) : (
          <FindingsEmpty
            reason={!connected ? 'disconnected' : state.findings === null ? 'unchecked' : 'clean'}
            ports={BRIDGE_PORT_RANGE}
          />
        )}
      </main>
      {connected && <CheckBar count={state.findings?.length ?? null} canCheck={canCheck} onCheck={checkAgain} />}
      <ResizeHandle onResize={resize} />
    </div>
  );
}

export { ZakuPanel };
