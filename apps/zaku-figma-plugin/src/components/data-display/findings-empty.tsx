import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

type FindingsEmptyProps = {
  /** False while no file is connected, so there is nothing to check. */
  canCheck: boolean;
  onCheckAgain: () => void;
} & React.ComponentProps<typeof Empty>;

function FindingsEmpty({ canCheck, onCheckAgain, ...props }: FindingsEmptyProps): React.JSX.Element {
  return (
    <Empty data-slot="findings-empty" {...props}>
      <EmptyHeader>
        <EmptyTitle>No findings</EmptyTitle>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" disabled={!canCheck} onClick={onCheckAgain}>
          Check again
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export { FindingsEmpty };
