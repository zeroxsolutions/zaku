import logo from '@/assets/images/zaku-logo.png';
import type { PanelStatus } from '@/lib/panel-state';
import { cn } from '@/lib/utils';

const STATUS_BAR_LABELS = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  disconnected: 'Not connected',
  idle: 'Not connected',
  unpaired: 'Not paired',
} as const satisfies Record<PanelStatus['state'], string>;

type StatusBarProps = {
  status: PanelStatus;
  file: string | null;
} & React.ComponentProps<'header'>;

/**
 * The file and the connection, a line each, cut short with the whole text on hover where the panel is too narrow;
 * an action for the connection goes in as children, at the end.
 */
function StatusBar({ status, file, className, children, ...props }: StatusBarProps): React.JSX.Element {
  const name = file ?? 'zaku';
  const label =
    status.state === 'connected'
      ? `${STATUS_BAR_LABELS.connected} on port ${status.port}`
      : STATUS_BAR_LABELS[status.state];
  return (
    <header
      data-slot="status-bar"
      data-status={status.state}
      className={cn('group/status-bar flex items-center gap-2.5 border-b px-3 py-2.5', className)}
      {...props}
    >
      <img data-slot="status-bar-logo" src={logo} alt="" className="size-7 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span data-slot="status-bar-file" title={name} className="truncate text-sm font-medium">
          {name}
        </span>
        <span
          data-slot="status-bar-status"
          title={label}
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
        >
          <span
            aria-hidden="true"
            className="bg-destructive group-data-[status=connected]/status-bar:bg-success group-data-[status=reconnecting]/status-bar:bg-warning size-1.5 shrink-0 rounded-full"
          />
          <span className="truncate">{label}</span>
        </span>
      </div>
      {children}
    </header>
  );
}

export { StatusBar };
