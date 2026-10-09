import { BRIDGE_PORT } from '@zeroxsolutions/zaku/schema';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FindingsEmpty } from '@/components/data-display/findings-empty';
import { FindingsList } from '@/components/data-display/findings-list';
import { StatusBar } from '@/components/feedback/status-bar';
import { ResizeHandle } from '@/components/general/resize-handle';
import { usePanel } from '@/hooks/use-panel';
import './styles.css';

function Panel(): React.JSX.Element {
  const { state, now, checkAgain, select, resize } = usePanel();
  const canCheck = state.status === 'connected' && state.file !== null && state.running === null;
  return (
    <div className="flex h-screen flex-col">
      <StatusBar status={state.status} port={BRIDGE_PORT} file={state.file} running={state.running} now={now} />
      {state.error !== null && (
        <p role="alert" className="text-error border-b px-3 py-2 text-xs">
          {state.error}
        </p>
      )}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {state.findings.length > 0 ? (
          <FindingsList findings={state.findings} onSelectNode={select} canCheck={canCheck} onCheckAgain={checkAgain} />
        ) : (
          <FindingsEmpty canCheck={canCheck} onCheckAgain={checkAgain} />
        )}
      </main>
      <ResizeHandle onResize={resize} />
    </div>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Panel />
  </StrictMode>,
);
