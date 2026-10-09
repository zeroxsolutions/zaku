import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ZakuPanel } from '@/components/feedback/zaku-panel';
import { usePanel } from '@/hooks/use-panel';
import './styles.css';

function Panel(): React.JSX.Element {
  return <ZakuPanel {...usePanel()} />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Panel />
  </StrictMode>,
);
