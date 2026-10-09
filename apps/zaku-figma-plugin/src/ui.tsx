import { BRIDGE_PORT } from '@zeroxsolutions/zaku/schema';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FindingsEmpty } from '@/components/data-display/findings-empty';
import { FindingsList } from '@/components/data-display/findings-list';
import { StatusBar } from '@/components/feedback/status-bar';
import { CheckBar } from '@/components/general/check-bar';
import { ResizeHandle } from '@/components/general/resize-handle';
import { usePanel } from '@/hooks/use-panel';
import './styles.css';

function Panel(): React.JSX.Element {
  const { state, now, checkAgain, select, resize } = usePanel();
  const connected = state.status === 'connected';
  const canCheck = connected && state.file !== null && state.running === null;
  return (
    <div className="flex h-screen flex-col">
      <StatusBar status={state.status} file={state.file} running={state.running} now={now} />
      {state.error !== null && (
        <p role="alert" className="text-error border-b px-3 py-2 text-xs">
          {state.error}
        </p>
      )}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {connected && state.findings !== null && state.findings.length > 0 ? (
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
