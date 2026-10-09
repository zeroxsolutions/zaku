import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CheckBarProps = {
  /** How many findings the last check reported; null before the first. */
  count: number | null;
  /** False while a command runs, so a check would race it. */
  canCheck: boolean;
  onCheck: () => void;
} & React.ComponentProps<'footer'>;

function CheckBar({ count, canCheck, onCheck, className, ...props }: CheckBarProps): React.JSX.Element {
  return (
    <footer
      data-slot="check-bar"
      className={cn('flex items-center justify-between gap-2 border-t px-3 py-2', className)}
      {...props}
    >
      <span data-slot="check-bar-count" className="text-muted-foreground text-xs tabular-nums">
        {count === null ? '' : `${count} ${count === 1 ? 'finding' : 'findings'}`}
      </span>
      <Button size="sm" disabled={!canCheck} onClick={onCheck}>
        Check page
      </Button>
    </footer>
  );
}

export { CheckBar };
