import { BRIDGE_PORT } from '@zeroxsolutions/zaku/schema';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FindingsEmpty } from '@/components/data-display/findings-empty';
import { FindingsList } from '@/components/data-display/findings-list';
import { PairingForm } from '@/components/data-entry/pairing-form';
import { StatusBar } from '@/components/feedback/status-bar';
import { CheckBar } from '@/components/general/check-bar';
import { ResizeHandle } from '@/components/general/resize-handle';
import { Button } from '@/components/ui/button';
import { usePanel } from '@/hooks/use-panel';
import { panelStatus } from '@/lib/panel-state';
import './styles.css';

function Panel(): React.JSX.Element {
  const { state, now, checkAgain, select, resize, pair, unpair } = usePanel();
  const status = panelStatus(state);
  const connected = status === 'connected';
  const canCheck = connected && state.file !== null && state.running === null;
  return (
    <div className="flex h-screen flex-col">
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
        {state.pairing.phase === 'unpaired' ? (
          <PairingForm refusal={state.pairing.refusal} onPair={pair} />
        ) : connected && state.findings !== null && state.findings.length > 0 ? (
          <FindingsList findings={state.findings} onSelectNode={select} />
        ) : (
          <FindingsEmpty
            reason={!connected ? 'disconnected' : state.findings === null ? 'unchecked' : 'clean'}
            port={BRIDGE_PORT}
          />
        )}
      </main>
      {connected && <CheckBar count={state.findings?.length ?? null} canCheck={canCheck} onCheck={checkAgain} />}
      <ResizeHandle onResize={resize} />
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Panel />
  </StrictMode>,
);
