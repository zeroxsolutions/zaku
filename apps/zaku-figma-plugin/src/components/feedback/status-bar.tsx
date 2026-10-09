import type { Running } from '@/lib/panel-state';
import type { RelayStatus } from '@/lib/relay';
import { cn } from '@/lib/utils';

const STATUS_BAR_LABELS: Record<RelayStatus, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  disconnected: 'Disconnected',
};

type StatusBarProps = {
  status: RelayStatus;
  port: number;
  file: string | null;
  running: Running | null;
  /** The clock the running time is read against, in milliseconds. */
  now: number;
} & React.ComponentProps<'div'>;

function StatusBar({ status, port, file, running, now, className, ...props }: StatusBarProps): React.JSX.Element {
  return (
    <div
      data-slot="status-bar"
      data-status={status}
      className={cn('group/status-bar flex items-center gap-2 border-b px-3 py-2 text-xs', className)}
      {...props}
    >
      <span
        data-slot="status-bar-dot"
        aria-hidden="true"
        className="bg-destructive group-data-[status=connected]/status-bar:bg-success group-data-[status=reconnecting]/status-bar:bg-warning size-2 shrink-0 rounded-full"
      />
      <span className="sr-only">{STATUS_BAR_LABELS[status]}</span>
      <span data-slot="status-bar-port" className="text-muted-foreground">
        :{port}
      </span>
      {file !== null && (
        <span data-slot="status-bar-file" className="truncate font-medium">
          {file}
        </span>
      )}
      {running !== null && (
        <span data-slot="status-bar-running" className="text-muted-foreground ms-auto tabular-nums">
          {running.command} {Math.floor((now - running.since) / 1000)}s
        </span>
      )}
    </div>
  );
}

export { StatusBar };
