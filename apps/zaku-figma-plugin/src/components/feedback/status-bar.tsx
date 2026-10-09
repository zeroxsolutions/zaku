import logo from '@/assets/images/zaku-logo.png';
import { Spinner } from '@/components/ui/spinner';
import type { Running } from '@/lib/panel-state';
import type { RelayStatus } from '@/lib/relay';
import { cn } from '@/lib/utils';

const STATUS_BAR_LABELS: Record<RelayStatus, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting',
  disconnected: 'Not connected',
};

const STATUS_BAR_VERBS: Record<Running['command'], string> = {
  execute: 'Running',
  read: 'Reading',
  check: 'Checking',
};

type StatusBarProps = {
  status: RelayStatus;
  file: string | null;
  running: Running | null;
  /** The clock the running time is read against, in milliseconds. */
  now: number;
} & React.ComponentProps<'header'>;

function StatusBar({ status, file, running, now, className, ...props }: StatusBarProps): React.JSX.Element {
  return (
    <header
      data-slot="status-bar"
      data-status={status}
      className={cn('group/status-bar flex items-center gap-2.5 border-b px-3 py-2.5', className)}
      {...props}
    >
      <img data-slot="status-bar-logo" src={logo} alt="" className="size-7 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span data-slot="status-bar-file" className="truncate text-sm font-medium">
          {file ?? 'zaku'}
        </span>
        <span data-slot="status-bar-status" className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className="bg-destructive group-data-[status=connected]/status-bar:bg-success group-data-[status=reconnecting]/status-bar:bg-warning size-1.5 shrink-0 rounded-full"
          />
          {STATUS_BAR_LABELS[status]}
        </span>
      </div>
      {running !== null && (
        <span
          data-slot="status-bar-running"
          className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs tabular-nums"
        >
          <Spinner className="size-3.5" />
          {STATUS_BAR_VERBS[running.command]} {Math.floor((now - running.since) / 1000)}s
        </span>
      )}
    </header>
  );
}

export { StatusBar };
