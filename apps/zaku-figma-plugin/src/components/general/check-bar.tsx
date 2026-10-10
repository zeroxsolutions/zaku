import { ScanSearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Running } from '@/lib/panel-state';
import { cn } from '@/lib/utils';

const CHECK_BAR_VERBS: Record<Running['command'], string> = {
  execute: 'Running',
  read: 'Reading',
  check: 'Checking',
  screenshot: 'Rendering',
};

type CheckBarProps = {
  /** How many findings the last check reported; null before the first. */
  count: number | null;
  /** False while a command runs, so a check would race it. */
  canCheck: boolean;
  /** The command running now, named beside the check it holds back; null when none runs. */
  running: Running | null;
  /** The clock the running time is read against, in milliseconds. */
  now: number;
  onCheck: () => void;
} & React.ComponentProps<'footer'>;

/** The check action, what the last check found, and what runs now, which is why the check waits. */
function CheckBar({ count, canCheck, running, now, onCheck, className, ...props }: CheckBarProps): React.JSX.Element {
  return (
    <footer
      data-slot="check-bar"
      className={cn('flex items-center justify-between gap-2 border-t px-3 py-2', className)}
      {...props}
    >
      <div className="text-muted-foreground flex min-w-0 items-center gap-3 text-xs tabular-nums">
        {running !== null && (
          <span data-slot="check-bar-running" className="flex shrink-0 items-center gap-1.5">
            <Spinner className="size-3.5" />
            {CHECK_BAR_VERBS[running.command]} {Math.floor((now - running.since) / 1000)}s
          </span>
        )}
        <span data-slot="check-bar-count" className="truncate">
          {count === null ? '' : `${count} ${count === 1 ? 'finding' : 'findings'}`}
        </span>
      </div>
      <Button size="sm" disabled={!canCheck} onClick={onCheck}>
        <ScanSearchIcon data-icon="inline-start" />
        Check page
      </Button>
    </footer>
  );
}

export { CheckBar };
